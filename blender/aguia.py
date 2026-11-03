"""
Aguia (de cabeca branca) low-poly para o jogo, gerada pelo Blender (sem janela).

Uso:
    blender --background --factory-startup --python blender/aguia.py -- <pasta_de_saida> [--glb <arquivo.glb>]

Gera as imagens de pre-visualizacao e, com --glb, exporta o modelo animado ("Fly", 16 quadros, 24 fps, em laco).
Convencoes do jogo: a aguia OLHA PARA -Y no Blender (vira +Z no glTF, como o lobo), Z para cima, asas ao longo de X.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
pasta = args[0] if args else os.getcwd()
glb = args[args.index('--glb') + 1] if '--glb' in args else None
os.makedirs(pasta, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
cena = bpy.context.scene


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


MARROM = material('marrom', (0.24, 0.14, 0.07))
MARROM_ESCURO = material('marrom_escuro', (0.14, 0.08, 0.04))
MARROM_CLARO = material('marrom_claro', (0.40, 0.25, 0.12))
BRANCO = material('branco', (0.96, 0.95, 0.90))
AMARELO = material('amarelo', (0.95, 0.72, 0.12))
OLHO = material('olho', (0.98, 0.85, 0.20))
PUPILA = material('pupila', (0.03, 0.03, 0.03))

# ------------------------------------------------------------------ esqueleto
# Asas ao longo de X; cada lado tem ombro, cotovelo e mao. Corpo olha para -Y.
OSSOS = [
    ('raiz', (0, 0.25, 0.0), (0, -0.05, 0.0), None),
    ('cabeca', (0, -0.30, 0.06), (0, -0.46, 0.08), 'raiz'),
    ('cauda', (0, 0.30, 0.0), (0, 0.62, -0.02), 'raiz'),
]
for lado, nome in ((1, 'd'), (-1, 'e')):
    OSSOS += [
        (f'ombro_{nome}', (lado * 0.10, -0.06, 0.06), (lado * 0.42, 0.0, 0.06), 'raiz'),
        (f'cotovelo_{nome}', (lado * 0.42, 0.0, 0.06), (lado * 0.80, 0.04, 0.06), f'ombro_{nome}'),
        (f'mao_{nome}', (lado * 0.80, 0.04, 0.06), (lado * 1.12, 0.10, 0.06), f'cotovelo_{nome}'),
    ]

arm_dados = bpy.data.armatures.new('Aguia')
arm = bpy.data.objects.new('Aguia', arm_dados)
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

# ------------------------------------------------------------------ partes
partes = []


def parte(obj, osso, mat, suave=True):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    if mat is not None:
        obj.data.materials.append(mat)

    if suave:
        bpy.ops.object.shade_smooth()

    obj.vertex_groups.new(name=osso).add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
    obj.select_set(False)
    partes.append(obj)

    return obj


def esfera(osso, mat, loc, esc, seg=12, aneis=8, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = esc

    return parte(o, osso, mat)


def cone(osso, mat, loc, raio, altura, rot, lados=6, raio2=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=lados, radius1=raio, radius2=raio2, depth=altura, location=loc, rotation=rot)

    return parte(bpy.context.active_object, osso, mat, suave=False)


def pena(osso, mat, base, direcao_graus, lado, comprimento, largura, espessura=0.011, lift=0.0):
    """Pena longa e fina que sai de `base` varrida para tras em `direcao_graus` (0 = reto para o lado, + = para tras)."""
    a = math.radians(direcao_graus)
    d = Vector((lado * math.cos(a), math.sin(a), 0.0))
    centro = Vector(base) + d * (comprimento / 2) + Vector((0, 0, lift))

    return esfera(osso, mat, centro, (comprimento / 2, largura * 1.35, espessura * 1.2), seg=8, aneis=4, rot=(0, 0, math.atan2(d.y, d.x)))


# Corpo: peito forte e barriga, de marrom escuro; pescoco e cabeca brancos.
esfera('raiz', MARROM, (0, -0.02, 0.0), (0.15, 0.36, 0.15))
esfera('raiz', MARROM, (0, -0.2, 0.01), (0.14, 0.2, 0.14))
esfera('raiz', MARROM_CLARO, (0, 0.12, -0.02), (0.12, 0.2, 0.11))
esfera('cabeca', BRANCO, (0, -0.34, 0.05), (0.095, 0.11, 0.09))      # pescoco
esfera('raiz', MARROM, (0, -0.27, 0.035), (0.125, 0.09, 0.115))        # gola de penas
esfera('cabeca', BRANCO, (0, -0.42, 0.075), (0.092, 0.095, 0.088))   # cabeca

# Bico: forte e curvo, amarelo, com a ponta em gancho; e os olhos com a sobrancelha "brava".
cone('cabeca', AMARELO, (0, -0.505, 0.055), 0.052, 0.12, (-math.pi / 2, 0, 0), lados=8, raio2=0.012)
cone('cabeca', AMARELO, (0, -0.555, 0.03), 0.018, 0.06, (-math.pi / 2 - 0.9, 0, 0), lados=6)
for lado in (-1, 1):
    esfera('cabeca', OLHO, (lado * 0.062, -0.46, 0.105), (0.02, 0.016, 0.02), seg=8, aneis=6)
    esfera('cabeca', PUPILA, (lado * 0.066, -0.472, 0.105), (0.009, 0.008, 0.009), seg=6, aneis=4)
    esfera('cabeca', BRANCO, (lado * 0.06, -0.455, 0.128), (0.034, 0.03, 0.01), seg=8, aneis=5, rot=(0, lado * 0.4, 0))

# Cauda branca em leque: penas que abrem para tras.
for i, ang in enumerate((-33, -22, -11, 0, 11, 22, 33)):
    a = math.radians(ang)
    comp = 0.42 - abs(ang) * 0.0025
    centro = Vector((math.sin(a) * comp / 2, 0.32 + math.cos(a) * comp / 2, -0.01))
    esfera('cauda', BRANCO, centro, (0.05, comp / 2, 0.012), seg=8, aneis=4, rot=(0, 0, -a))

# Pernas e garras amarelas, recolhidas sob o corpo.
for lado in (-1, 1):
    esfera('raiz', AMARELO, (lado * 0.07, 0.12, -0.15), (0.04, 0.05, 0.06), seg=8, aneis=5)
    for dx in (-0.02, 0.0, 0.02):
        cone('raiz', AMARELO, (lado * 0.07 + dx, 0.09, -0.22), 0.012, 0.07, (0.5, 0, 0), lados=4)

# Asas: braco (marrom claro), antebraco e uma "mao" com penas primarias longas e abertas, mais as secundarias atras.
for lado, nome in ((1, 'd'), (-1, 'e')):
    esfera(f'ombro_{nome}', MARROM, (lado * 0.26, -0.01, 0.06), (0.17, 0.13, 0.04))
    esfera(f'cotovelo_{nome}', MARROM, (lado * 0.60, 0.03, 0.06), (0.21, 0.12, 0.03))
    esfera(f'mao_{nome}', MARROM_ESCURO, (lado * 0.86, 0.06, 0.06), (0.12, 0.07, 0.022))

    # Secundarias: penas curtas que saem para tras do braco e do antebraco.
    for k in range(4):
        pena(f'ombro_{nome}', MARROM_ESCURO, (lado * (0.10 + k * 0.08), 0.06, 0.06), 78 + k * 3, lado, 0.22, 0.04, lift=-0.005)

    for k in range(4):
        pena(f'cotovelo_{nome}', MARROM_ESCURO, (lado * (0.45 + k * 0.09), 0.09, 0.06), 70 + k * 4, lado, 0.24, 0.042, lift=-0.004)

    # Cobertura: fileiras de penas curtas e claras por cima, como as telhas de um telhado.
    for k in range(5):
        pena(f'ombro_{nome}', MARROM_CLARO, (lado * (0.10 + k * 0.07), 0.0, 0.075), 70 + k * 2, lado, 0.17, 0.046, lift=0.004)

    for k in range(5):
        pena(f'cotovelo_{nome}', MARROM_CLARO, (lado * (0.44 + k * 0.07), 0.035, 0.075), 66 + k * 3, lado, 0.17, 0.046, lift=0.004)

    # Primarias: 7 penas longas em leque a partir do pulso (as da frente mais compridas), com a ponta levantada.
    for k in range(7):
        pena(f'mao_{nome}', MARROM_ESCURO, (lado * 0.80, 0.07, 0.06), 6 + k * 11, lado, 0.42 - k * 0.025, 0.036, lift=0.01 - k * 0.001)

# ------------------------------------------------------------------ junta tudo
for o in partes:
    o.select_set(True)

bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.join()
malha = bpy.context.active_object
malha.name = 'AguiaMalha'
malha.parent = arm
mod = malha.modifiers.new('Esqueleto', 'ARMATURE')
mod.object = arm
print('triangulos:', sum(len(p.vertices) - 2 for p in malha.data.polygons))

# ------------------------------------------------------------------ animacao "Fly" (16 quadros em laco)
FPS = 24
QUADROS = 16
cena.render.fps = FPS
cena.frame_start = 1
cena.frame_end = QUADROS + 1
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')

for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'


def eixo_que_levanta(osso):
    """Descobre qual eixo Euler do osso levanta a ponta (z) e com que sinal, sem depender da orientacao do osso."""
    pb = arm.pose.bones[osso]
    pb.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()
    z0 = (arm.matrix_world @ pb.tail).z
    melhor = (0, 1.0, 0.0)

    for eixo in range(3):
        angulos = [0, 0, 0]
        angulos[eixo] = 0.3
        pb.rotation_euler = angulos
        bpy.context.view_layer.update()
        dz = (arm.matrix_world @ pb.tail).z - z0

        if abs(dz) > abs(melhor[2]):
            melhor = (eixo, 1.0 if dz > 0 else -1.0, dz)

    pb.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.update()

    return melhor[0], melhor[1]


EIXOS = {osso: eixo_que_levanta(osso) for osso in ('ombro_d', 'ombro_e', 'cotovelo_d', 'cotovelo_e', 'mao_d', 'mao_e')}
print('eixos que levantam:', EIXOS)


def levantar(osso, quadro, angulo):
    eixo, sinal = EIXOS[osso]
    valores = [0.0, 0.0, 0.0]
    valores[eixo] = sinal * angulo
    pb = arm.pose.bones[osso]
    pb.rotation_euler = valores
    pb.keyframe_insert('rotation_euler', frame=quadro)


for q in range(QUADROS + 1):
    t = q / QUADROS * math.tau
    # Batida de asa: o ombro lidera; o cotovelo e a mao atrasam, entao a ponta da asa "chicoteia".
    for nome in ('d', 'e'):
        levantar(f'ombro_{nome}', q + 1, math.sin(t) * 0.46 + 0.05)
        levantar(f'cotovelo_{nome}', q + 1, math.sin(t - 0.7) * 0.30)
        levantar(f'mao_{nome}', q + 1, math.sin(t - 1.3) * 0.30)

    # O corpo sobe um pouco quando as asas descem; a cauda e a cabeca compensam.
    arm.pose.bones['raiz'].location = (0, 0, -math.sin(t) * 0.035)
    arm.pose.bones['raiz'].keyframe_insert('location', frame=q + 1)
    arm.pose.bones['raiz'].rotation_euler = (math.sin(t) * 0.03, 0, 0)
    arm.pose.bones['raiz'].keyframe_insert('rotation_euler', frame=q + 1)
    arm.pose.bones['cabeca'].rotation_euler = (-math.sin(t) * 0.03, 0, 0)
    arm.pose.bones['cabeca'].keyframe_insert('rotation_euler', frame=q + 1)
    arm.pose.bones['cauda'].rotation_euler = (math.sin(t - 0.8) * 0.08, 0, 0)
    arm.pose.bones['cauda'].keyframe_insert('rotation_euler', frame=q + 1)

bpy.ops.object.mode_set(mode='OBJECT')
arm.animation_data.action.name = 'Fly'

# ------------------------------------------------------------------ sombreamento do pelo/penas (cor de vertice)
# Escurece o que olha para baixo e as dobras, clareia o dorso: da volume sem textura. O glTF multiplica pela cor do material.
def sombrear(obj):
    dados = obj.data
    attr = dados.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    zs = [v.co.z for v in dados.vertices]
    zmin, zmax = min(zs), max(zs)

    for v in dados.vertices:
        altura = (v.co.z - zmin) / max(zmax - zmin, 1e-6)
        luz = 0.5 + 0.5 * v.normal.z
        k = 0.58 + 0.30 * luz + 0.12 * altura
        attr.data[v.index].color = (k, k, k, 1.0)

    dados.color_attributes.active_color = attr
    dados.color_attributes.render_color_index = list(dados.color_attributes).index(attr)


sombrear(malha)

# ------------------------------------------------------------------ exportacao
if glb:
    for o in cena.objects:
        o.select_set(o in (arm, malha))

    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_animations=True,
                              export_yup=True, export_apply=False, export_image_format='NONE', export_vertex_color='ACTIVE')
    print('GLB:', glb, os.path.getsize(glb), 'bytes')

# ------------------------------------------------------------------ pre-visualizacao
cena.render.engine = 'BLENDER_WORKBENCH'
cena.display.shading.light = 'STUDIO'
cena.display.shading.color_type = 'MATERIAL'
cena.render.resolution_x = 520
cena.render.resolution_y = 380
cena.world = bpy.data.worlds.new('mundo')
cena.world.color = (0.74, 0.88, 0.97)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cena.collection.objects.link(cam)
cena.camera = cam
cam.data.lens = 50

VISTAS = {
    'lado': ((0.2, -4.4, 0.35), (0, 0, 0.0)),        # de frente para o bico e as asas abertas
    'tras': ((0.0, 4.4, 0.9), (0, 0, 0.0)),          # como o jogo mostra
    'tres_quartos': ((3.2, 2.9, 1.4), (0, 0, 0.0)),
}

for nome, (pos, alvo) in VISTAS.items():
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - cam.location).to_track_quat('-Z', 'Y').to_euler()

    for i, quadro in enumerate((1, 5, 9)):
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(pasta, f'aguia-{nome}-{i}.png')
        bpy.ops.render.render(write_still=True)

print('PREVIEWS_OK')
