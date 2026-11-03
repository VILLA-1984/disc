"""
Gato low-poly para o jogo, gerado pelo Blender (sem janela).

Uso:
    blender --background --factory-startup --python blender/gato.py -- <pasta_de_saida> [--glb <arquivo.glb>]

Gera na pasta de saida as imagens de pre-visualizacao (lado, tras e 3/4, em tres momentos da corrida) e, com --glb,
exporta o modelo animado ("Run", 16 quadros, 24 fps, em laco) para o jogo.

Convencoes do jogo: o gato OLHA PARA -Y no Blender (vira +Z no glTF, como o lobo), Z para cima, patas em z = 0.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

# ------------------------------------------------------------------ argumentos
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
pasta = args[0] if args else os.getcwd()
glb = args[args.index('--glb') + 1] if '--glb' in args else None
os.makedirs(pasta, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene

# ------------------------------------------------------------------ materiais
def material(nome, rgb):
    m = bpy.data.materials.new(nome)
    m.diffuse_color = (*rgb, 1)
    try:
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*rgb, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    except Exception:
        pass
    return m

LARANJA = material('pelo', (0.80, 0.42, 0.12))
LISTRA = material('listra', (0.42, 0.20, 0.06))
CLARO = material('claro', (0.97, 0.90, 0.78))
ROSA = material('rosa', (0.93, 0.55, 0.58))
OLHO = material('olho', (0.45, 0.78, 0.25))
PUPILA = material('pupila', (0.04, 0.04, 0.04))

# ------------------------------------------------------------------ esqueleto
# (nome, cabeca, cauda, pai). Patas de cima para baixo; cauda em cadeia; olha para -Y.
OSSOS = [
    ('raiz', (0, 0.05, 0.42), (0, -0.08, 0.42), None),
    ('cabeca', (0, -0.28, 0.50), (0, -0.46, 0.55), 'raiz'),
    ('cauda1', (0, 0.28, 0.46), (0, 0.38, 0.52), 'raiz'),
    ('cauda2', (0, 0.38, 0.52), (0, 0.45, 0.60), 'cauda1'),
    ('cauda3', (0, 0.45, 0.60), (0, 0.49, 0.69), 'cauda2'),
    ('cauda4', (0, 0.49, 0.69), (0, 0.49, 0.78), 'cauda3'),
]
PATAS = {  # nome: (x, y do quadril, altura do quadril, joelho, pe)
    'df': (0.085, -0.17, 0.40, 0.22, 0.03),
    'de': (-0.085, -0.17, 0.40, 0.22, 0.03),
    'tf': (0.09, 0.19, 0.40, 0.21, 0.03),
    'te': (-0.09, 0.19, 0.40, 0.21, 0.03),
}
for nome, (x, y, zq, zj, zp) in PATAS.items():
    OSSOS.append((f'{nome}_cima', (x, y, zq), (x, y + (0.015 if nome[0] == 't' else 0.0), zj), 'raiz'))
    OSSOS.append((f'{nome}_baixo', (x, y + (0.015 if nome[0] == 't' else 0.0), zj), (x, y, zp), f'{nome}_cima'))

arm_dados = bpy.data.armatures.new('Gato')
arm = bpy.data.objects.new('Gato', arm_dados)
cena.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
for nome, cabeca, cauda, pai in OSSOS:
    osso = arm_dados.edit_bones.new(nome)
    osso.head = Vector(cabeca)
    osso.tail = Vector(cauda)

    if pai:
        osso.parent = arm_dados.edit_bones[pai]
bpy.ops.object.mode_set(mode='OBJECT')

# ------------------------------------------------------------------ partes do corpo
partes = []


def parte(obj, osso, mat, suave=True):
    """Fixa a escala, pinta e liga a parte inteira a um osso (peso 1)."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.data.materials.append(mat)

    if suave:
        bpy.ops.object.shade_smooth()

    obj.vertex_groups.new(name=osso).add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
    obj.select_set(False)
    partes.append(obj)

    return obj


def esfera(osso, mat, loc, esc, seg=14, aneis=9, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = esc

    return parte(o, osso, mat)


def cone(osso, mat, loc, raio, altura, rot, lados=4):
    bpy.ops.mesh.primitive_cone_add(vertices=lados, radius1=raio, radius2=0, depth=altura, location=loc, rotation=rot)

    return parte(bpy.context.active_object, osso, mat, suave=False)


def cilindro(osso, mat, de, ate, r1, r2):
    """Cilindro afinando de `de` (raio r1) ate `ate` (raio r2)."""
    a, b = Vector(de), Vector(ate)
    meio = (a + b) / 2
    direcao = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r1, radius2=r2, depth=direcao.length, location=meio)
    bpy.context.active_object.name = 'segmento'
    o = bpy.context.active_object
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = direcao.to_track_quat('Z', 'Y')  # o eixo Z do cone aponta de `de` para `ate`

    return parte(o, osso, mat)


# Tronco: um volume organico unico, feito de "metabolas" (blobs que se fundem): peito, ombros, barriga e quadril/coxas.
mb = bpy.data.metaballs.new('Tronco')
mb.resolution = 0.045
mb.render_resolution = 0.045
mb.threshold = 0.6
tronco_obj = bpy.data.objects.new('Tronco', mb)
cena.collection.objects.link(tronco_obj)


def blob(loc, raio, sx=1.0, sy=1.0, sz=1.0, rigidez=2.0):
    e = mb.elements.new(type='ELLIPSOID')
    e.co = Vector(loc)
    e.radius = raio
    e.size_x, e.size_y, e.size_z = sx, sy, sz
    e.stiffness = rigidez


blob((0, -0.16, 0.44), 0.21, 1.0, 1.25, 1.0)     # peito
blob((0.075, -0.15, 0.40), 0.13, 0.8, 1.1, 1.1)   # ombro direito
blob((-0.075, -0.15, 0.40), 0.13, 0.8, 1.1, 1.1)  # ombro esquerdo
blob((0, 0.0, 0.43), 0.19, 1.0, 1.5, 0.95)        # barriga
blob((0, 0.20, 0.44), 0.21, 1.0, 1.2, 1.0)       # quadril
blob((0.08, 0.2, 0.39), 0.15, 0.8, 1.2, 1.15)    # coxa direita
blob((-0.08, 0.2, 0.39), 0.15, 0.8, 1.2, 1.15)   # coxa esquerda
blob((0, -0.3, 0.49), 0.13, 0.9, 1.0, 1.0)        # pescoco

# Gera a malha a partir das metabolas (sem depender de selecao) e descarta o objeto de metabolas.
cena.frame_set(1)
avaliado = tronco_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
malha_tronco = bpy.data.meshes.new_from_object(avaliado)
bpy.data.objects.remove(tronco_obj)
tronco_obj = bpy.data.objects.new('Tronco', malha_tronco)
cena.collection.objects.link(tronco_obj)
parte(tronco_obj, 'raiz', LARANJA)
print('triangulos do tronco:', sum(len(p.vertices) - 2 for p in tronco_obj.data.polygons))
esfera('raiz', CLARO, (0, -0.2, 0.355), (0.075, 0.12, 0.06))  # peito claro
for y in (-0.06, 0.08, 0.2):  # listras do dorso
    esfera('raiz', LISTRA, (0, y, 0.545), (0.1, 0.022, 0.026), seg=10, aneis=6)

# Cabeca: larga, focinho curto, bochechas, olhos grandes e orelhas pontudas.
esfera('cabeca', LARANJA, (0, -0.395, 0.52), (0.135, 0.12, 0.115))
for lado in (-1, 1):
    esfera('cabeca', LARANJA, (lado * 0.075, -0.45, 0.49), (0.06, 0.06, 0.05), seg=10, aneis=7)  # bochecha
    esfera('cabeca', OLHO, (lado * 0.058, -0.488, 0.545), (0.032, 0.014, 0.034), seg=10, aneis=7)
    esfera('cabeca', PUPILA, (lado * 0.058, -0.5, 0.545), (0.014, 0.006, 0.027), seg=8, aneis=6)
    cone('cabeca', LARANJA, (lado * 0.078, -0.37, 0.625), 0.052, 0.13, (-0.15, lado * 0.32, 0))
    cone('cabeca', ROSA, (lado * 0.078, -0.382, 0.62), 0.03, 0.09, (-0.15, lado * 0.32, 0))
esfera('cabeca', CLARO, (0, -0.505, 0.485), (0.065, 0.045, 0.045))  # focinho
esfera('cabeca', ROSA, (0, -0.545, 0.5), (0.02, 0.012, 0.014), seg=8, aneis=6)  # nariz

# Cauda comprida e levantada; a ponta e escura.
cauda = [('cauda1', (0, 0.28, 0.46), (0, 0.38, 0.52)), ('cauda2', (0, 0.38, 0.52), (0, 0.45, 0.60)),
         ('cauda3', (0, 0.45, 0.60), (0, 0.49, 0.69)), ('cauda4', (0, 0.49, 0.69), (0, 0.49, 0.78))]
for i, (osso, de, ate) in enumerate(cauda):
    cilindro(osso, LISTRA if i == 3 else LARANJA, de, ate, 0.036 - i * 0.003, 0.033 - i * 0.003)
    esfera(osso, LISTRA if i == 3 else LARANJA, ate, (0.032 - i * 0.003,) * 3, seg=8, aneis=6)

# Patas: coxa, canela e uma pata clara e arredondada.
for nome, (x, y, zq, zj, zp) in PATAS.items():
    yj = y + (0.015 if nome[0] == 't' else 0.0)
    cilindro(f'{nome}_cima', LARANJA, (x, y, zq), (x, yj, zj), 0.058 if nome[0] == 't' else 0.05, 0.04)
    cilindro(f'{nome}_baixo', LARANJA, (x, yj, zj), (x, y, zp + 0.02), 0.04, 0.03)
    esfera(f'{nome}_baixo', CLARO, (x, y - 0.012, zp), (0.04, 0.06, 0.032), seg=10, aneis=7)

# ------------------------------------------------------------------ junta tudo em uma malha so
for o in partes:
    o.select_set(True)

bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.join()
malha = bpy.context.active_object
malha.name = 'GatoMalha'
malha.parent = arm
mod = malha.modifiers.new('Esqueleto', 'ARMATURE')
mod.object = arm

# ------------------------------------------------------------------ animacao "Run" (16 quadros em laco)
FPS = 24
QUADROS = 16
cena.render.fps = FPS
cena.frame_start = 1
cena.frame_end = QUADROS + 1  # o ultimo quadro repete o primeiro: o laco fecha sem salto
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')

for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'

# Fase de cada pata: o galope do gato junta as patas dianteiras e depois as traseiras.
FASES = {'df': 0.0, 'de': 0.35, 'tf': math.pi * 0.95, 'te': math.pi * 0.95 + 0.35}


def chave(osso, quadro, x=0.0, y=0.0, z=0.0):
    pb = arm.pose.bones[osso]
    pb.rotation_euler = (x, y, z)
    pb.keyframe_insert('rotation_euler', frame=quadro)


for q in range(QUADROS + 1):
    t = q / QUADROS * math.tau
    # O corpo sobe e desce duas vezes por passada, e a coluna arqueia.
    arm.pose.bones['raiz'].location = (0, 0, abs(math.sin(t)) * 0.05)
    arm.pose.bones['raiz'].keyframe_insert('location', frame=q + 1)
    chave('raiz', q + 1, x=math.sin(t * 2) * 0.05)
    chave('cabeca', q + 1, x=-math.sin(t * 2) * 0.05)

    for nome, fase in FASES.items():
        a = math.sin(t + fase)
        chave(f'{nome}_cima', q + 1, x=a * 0.85)
        chave(f'{nome}_baixo', q + 1, x=max(0.0, math.sin(t + fase + 1.4)) * 1.1)

    for i, osso in enumerate(['cauda1', 'cauda2', 'cauda3', 'cauda4']):
        chave(osso, q + 1, z=math.sin(t - i * 0.7) * 0.18, x=-0.12)

bpy.ops.object.mode_set(mode='OBJECT')
acao = arm.animation_data.action
acao.name = 'Run'

# ------------------------------------------------------------------ exportacao
if glb:
    for o in cena.objects:
        o.select_set(o in (arm, malha))

    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_animations=True,
                              export_yup=True, export_apply=False, export_image_format='NONE')
    print('GLB:', glb, os.path.getsize(glb), 'bytes')

# ------------------------------------------------------------------ pre-visualizacao
cena.render.engine = 'BLENDER_WORKBENCH'
cena.display.shading.light = 'STUDIO'
cena.display.shading.color_type = 'MATERIAL'
cena.display.shading.show_cavity = False
cena.render.resolution_x = 520
cena.render.resolution_y = 380
cena.render.film_transparent = False
cena.world = bpy.data.worlds.new('mundo')
cena.world.color = (0.80, 0.90, 0.96)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cena.collection.objects.link(cam)
cena.camera = cam
cam.data.lens = 55

VISTAS = {
    'lado': ((2.5, -0.02, 0.38), (0, 0, 0.38)),
    'tras': ((0.0, 2.7, 0.75), (0, -0.05, 0.38)),
    'tres_quartos': ((1.7, 1.5, 0.95), (0, 0, 0.38)),
}

for nome, (pos, alvo) in VISTAS.items():
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - cam.location).to_track_quat('-Z', 'Y').to_euler()

    for i, quadro in enumerate((1, 5, 9)):
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(pasta, f'gato-{nome}-{i}.png')
        bpy.ops.render.render(write_still=True)

print('PREVIEWS_OK')
