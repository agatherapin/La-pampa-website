"""
Script de conversion d'images en WebP pour ton portfolio.
- Convertit tous les .jpg, .jpeg, .png, .avif en .webp (qualité 80)
- Convertit les .gif animés en .webp animé
- Sauvegarde les originaux dans un dossier "originals_backup"
- Supprime les originaux après conversion (seuls les .webp restent)
- Met à jour les chemins dans tous les fichiers .js automatiquement
"""

import os
import sys
import shutil
from PIL import Image

# ========== CONFIGURATION ==========
# Change ce chemin si ton dossier de projet est ailleurs
PROJECT_FOLDER = "."  # = le dossier où tu lances le script
IMG_FOLDER = os.path.join(PROJECT_FOLDER, "img")
JS_FOLDER = PROJECT_FOLDER  # Dossier où chercher les fichiers .js à mettre à jour
BACKUP_FOLDER = os.path.join(PROJECT_FOLDER, "originals_backup")
QUALITY = 80  # Qualité WebP (80 = bon compromis taille/qualité)
IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".avif"}
MAX_SIZE_COVER = 800    # Pour img/covers/ → affiché en petit dans la sphère
MAX_SIZE_ARTICLE = 1800 # Pour img/articles/ → affiché en plein écran
# ====================================

converted = 0
skipped = 0
errors = []

def convert_image(filepath):
    """Convertit une image en WebP avec la taille adaptée selon le dossier."""
    global converted, skipped

    ext = os.path.splitext(filepath)[1].lower()
    webp_path = os.path.splitext(filepath)[0] + ".webp"

    # Choisit la taille max selon le sous-dossier
    if "covers" in filepath:
        max_size = MAX_SIZE_COVER
    elif "articles" in filepath:
        max_size = MAX_SIZE_ARTICLE
    else:
        max_size = MAX_SIZE_COVER  # fallback : taille cover par défaut

    # Skip si le webp existe déjà, mais supprime quand même l'original
    if os.path.exists(webp_path):
        print(f"  ⏭  Déjà converti : {os.path.basename(webp_path)}")
        os.remove(filepath)
        skipped += 1
        return

    try:
        img = Image.open(filepath)

        if ext == ".gif" and hasattr(img, "n_frames") and img.n_frames > 1:
            # GIF animé → WebP animé
            img.thumbnail((max_size, max_size), Image.LANCZOS)
            img.save(
                webp_path,
                "WEBP",
                save_all=True,
                quality=QUALITY,
                method=4,
            )
            print(f"  ✅ GIF animé → {os.path.basename(webp_path)}")
        else:
            # Image statique (jpg, png, gif statique)
            img.thumbnail((max_size, max_size), Image.LANCZOS)
            if img.mode in ("RGBA", "LA", "PA"):
                # Garde la transparence pour les PNG
                img.save(webp_path, "WEBP", quality=QUALITY, method=4)
            else:
                img = img.convert("RGB")
                img.save(webp_path, "WEBP", quality=QUALITY, method=4)
            print(f"  ✅ {os.path.basename(filepath)} → {os.path.basename(webp_path)}")

        converted += 1
        os.remove(filepath)

    except Exception as e:
        errors.append((filepath, str(e)))
        print(f"  ❌ Erreur : {os.path.basename(filepath)} — {e}")


def update_js_paths(js_folder):
    """Remplace les extensions .jpg/.png/.gif par .webp dans tous les fichiers .js du projet."""
    js_files = [
        os.path.join(js_folder, f)
        for f in os.listdir(js_folder)
        if f.endswith(".js") and os.path.isfile(os.path.join(js_folder, f))
    ]

    if not js_files:
        print(f"\n⚠️  Aucun fichier .js trouvé dans '{js_folder}'.")
        return

    print()
    for js_file in sorted(js_files):
        with open(js_file, "r", encoding="utf-8") as f:
            content = f.read()

        original = content

        for ext in IMG_EXTENSIONS:
            content = content.replace(ext + "'", ".webp'")
            content = content.replace(ext + '"', '.webp"')

        if content != original:
            with open(js_file, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ {os.path.basename(js_file)} mis à jour — chemins → .webp")
        else:
            print(f"⏭  {os.path.basename(js_file)} — aucun changement nécessaire")


def backup_originals():
    """Copie les originaux dans un dossier de backup."""
    for root, dirs, files in os.walk(IMG_FOLDER):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in IMG_EXTENSIONS:
                src = os.path.join(root, filename)
                # Reproduit la structure de dossiers dans le backup
                rel_path = os.path.relpath(src, IMG_FOLDER)
                dst = os.path.join(BACKUP_FOLDER, rel_path)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)


# ========== LANCEMENT ==========
print("=" * 50)
print("🖼  Conversion d'images en WebP")
print("=" * 50)

# Vérifie que le dossier img existe
if not os.path.exists(IMG_FOLDER):
    print(f"\n❌ Dossier '{IMG_FOLDER}' introuvable !")
    print("Lance ce script depuis la racine de ton projet (là où il y a le dossier img/)")
    exit(1)

# 1. Backup des originaux
print(f"\n📦 Sauvegarde des originaux dans '{BACKUP_FOLDER}'...")
backup_originals()
print("   Fait !")

# 2. Conversion
print(f"\n🔄 Conversion en cours (qualité {QUALITY})...\n")

if len(sys.argv) > 1:
    # Un fichier spécifique passé en argument
    filepath = sys.argv[1]
    if os.path.exists(filepath):
        convert_image(filepath)
    else:
        print(f"❌ Fichier introuvable : {filepath}")
else:
    # Tout le dossier img/
    for root, dirs, files in os.walk(IMG_FOLDER):
        for filename in sorted(files):
            ext = os.path.splitext(filename)[1].lower()
            if ext in IMG_EXTENSIONS:
                filepath = os.path.join(root, filename)
                convert_image(filepath)

# 3. Mise à jour des fichiers .js
update_js_paths(JS_FOLDER)

# 4. Résumé
print("\n" + "=" * 50)
print(f"📊 Résumé :")
print(f"   ✅ {converted} images converties")
print(f"      — covers/   : max {MAX_SIZE_COVER}px")
print(f"      — articles/ : max {MAX_SIZE_ARTICLE}px")
print(f"   ⏭  {skipped} déjà en webp")
if errors:
    print(f"   ❌ {len(errors)} erreurs :")
    for path, err in errors:
        print(f"      - {path}: {err}")
print("=" * 50)

print("\n💡 Prochaines étapes :")
print("   1. Vérifie que tout marche en ouvrant index.html")
print("   2. Les originaux sont sauvegardés dans 'originals_backup' si besoin de rollback")
print("   3. Push sur GitHub Desktop et Vercel se met à jour")