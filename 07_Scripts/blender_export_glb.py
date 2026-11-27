"""
BLENDER_EXPORT_GLB.PY
Script Python exécuté en arrière-plan par Blender CLI (bpy).
Convertit ou exporte un modèle 3D (OBJ, FBX, DAE, STL, PLY, BLEND, GLTF) en .GLB optimisé pour Three.js.

RÈGLE D'UTILISATION :
Ce script est exécuté UNIQUEMENT sur demande explicite de l'utilisateur.
Le rendu vidéo s'effectue ensuite en temps réel dans Three.js à 60 FPS.

Usage en CLI :
  blender --background --python 07_Scripts/blender_export_glb.py -- <inputFile> <outputGlb>
"""

import sys
import os

try:
    import bpy
except ImportError:
    print("Ce script doit être exécuté par l'interpréteur Python interne de Blender.")
    sys.exit(1)


def get_args():
    # Récupérer les arguments passés après '--'
    argv = sys.argv
    if "--" not in argv:
        return None, None
    args_after = argv[argv.index("--") + 1:]
    if len(args_after) < 1:
        return None, None
    input_path = args_after[0]
    output_path = args_after[1] if len(args_after) > 1 else None
    return input_path, output_path


def clear_scene():
    """Supprime les objets par défaut (cube, caméra, lampe)"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def import_model(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == '.blend':
        # Déjà un fichier blend, rien à importer
        return True
    
    clear_scene()
    
    if ext == '.obj':
        if hasattr(bpy.ops.wm, 'obj_import'):
            bpy.ops.wm.obj_import(filepath=filepath)
        elif hasattr(bpy.ops.import_scene, 'obj'):
            bpy.ops.import_scene.obj(filepath=filepath)
        else:
            raise RuntimeError("Importeur OBJ introuvable dans cette version de Blender.")
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.gltf' or ext == '.glb':
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.stl':
        bpy.ops.import_mesh.stl(filepath=filepath)
    elif ext == '.dae':
        bpy.ops.wm.collada_import(filepath=filepath)
    elif ext == '.ply':
        bpy.ops.import_mesh.ply(filepath=filepath)
    else:
        raise ValueError(f"Format non supporté : {ext}")
    
    return True


def normalize_and_center():
    """Centre la géométrie à l'origine (0, 0, 0)"""
    selected_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    if not selected_objects:
        return
    
    # Sélectionner tous les meshes
    bpy.ops.object.select_all(action='DESELECT')
    for obj in selected_objects:
        obj.select_set(True)
    
    if bpy.context.selected_objects:
        bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
        try:
            bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        except Exception:
            pass


def export_glb(output_path):
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    
    # Export glTF 2.0 binaire (.glb)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_apply=True,
        export_materials='EXPORT',
        export_colors=True,
        export_cameras=False,
        export_lights=False
    )
    print(f"✅ EXPORT_SUCCESS: {output_path}")


def main():
    input_path, output_path = get_args()
    if not input_path:
        print("Usage: blender --background --python 07_Scripts/blender_export_glb.py -- <inputFile> [outputGlb]")
        sys.exit(1)
    
    if not os.path.exists(input_path):
        print(f"❌ Erreur : fichier source introuvable -> {input_path}")
        sys.exit(1)
        
    if not output_path:
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_path = os.path.join("01_Assets", "3D", f"{base_name}.glb")
        
    try:
        print(f"📦 Import du modèle : {input_path}")
        import_model(input_path)
        normalize_and_center()
        print(f"🚀 Exportation GLB optimisée vers : {output_path}")
        export_glb(output_path)
        sys.exit(0)
    except Exception as e:
        print(f"❌ Erreur d'exportation Blender : {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
