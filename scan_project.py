import os
from pathlib import Path

# Dossiers lourds/temporel à ignorer pour garder un rapport lisible et utile
IGNORED_DIRS = {
    '__pycache__', '.git', '.idea', '.vscode', 'build', 'dist',
    'venv', '.venv', 'env', '.dart_tool', '.gradle', 'node_modules',
    '.pytest_cache', '.mypy_cache', 'obj', 'bin'
}

# Extensions inutiles pour l'analyse du code
IGNORED_EXTENSIONS = {
    '.pyc', '.pyo', '.exe', '.dll', '.so', '.dylib', '.zip', '.tar',
    '.gz', '.7z', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf'
}

def generate_tree(dir_path, prefix="", output_lines=None):
    if output_lines is None:
        output_lines = []

    try:
        entries = sorted(os.listdir(dir_path))
    except PermissionError:
        return output_lines

    # Filtrer les fichiers/dossiers ignorés
    entries = [
        e for e in entries
        if e not in IGNORED_DIRS and Path(e).suffix.lower() not in IGNORED_EXTENSIONS
    ]

    total_entries = len(entries)
    for index, entry in enumerate(entries):
        path = os.path.join(dir_path, entry)
        is_last = (index == total_entries - 1)

        connector = "└── " if is_last else "├── "

        if os.path.isdir(path):
            output_lines.append(f"{prefix}{connector}{entry}/")
            new_prefix = prefix + ("    " if is_last else "│   ")
            generate_tree(path, new_prefix, output_lines)
        else:
            output_lines.append(f"{prefix}{connector}{entry}")

    return output_lines

def main():
    root_dir = os.getcwd()
    root_name = os.path.basename(root_dir)

    print(f"Génération de l'arborescence pour : {root_dir}")

    lines = [f"PROJET : {root_name}", f"CHEMIN : {root_dir}", "=" * 50, ""]
    tree_lines = generate_tree(root_dir)
    lines.extend(tree_lines)

    output_filename = "arborescence_projet.txt"
    output_path = os.path.join(root_dir, output_filename)

    # Écriture dans le fichier textuel
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"\n✅ Arborescence enregistrée avec succès dans : {output_filename}")

if __name__ == "__main__":
    main()
