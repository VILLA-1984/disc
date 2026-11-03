"""
Tubarao-branco para o jogo, gerado pelo Blender (sem janela).

Uso:
    blender --background --factory-startup --python blender/tubarao.py -- <pasta_de_saida> [--glb <arquivo.glb>]

Gera na pasta de saida as imagens de pre-visualizacao (lado, tras e 3/4, em tres momentos da corrida) e, com --glb,
exporta o modelo animado ("Swim", 30 quadros, 24 fps, em laco) para o jogo.

Convencoes do jogo: o tubarao OLHA PARA -Y no Blender (vira +Z no glTF), Z para cima.
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
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.55
    except Exception:
        pass
    return m

AZUL = material('dorso', (0.34, 0.43, 0.52))
BARBATANA = material('barbatana', (0.27, 0.34, 0.42))
BRANCO = material('barriga', (0.93, 0.95, 0.96))
PRETO = material('preto', (0.02, 0.02, 0.03))
BOCA = material('boca', (0.45, 0.10, 0.12))
DENTE = material('dente', (0.98, 0.97, 0.92))

ALTURA = 0.32  # linha central do corpo

# ------------------------------------------------------------------ esqueleto
# Coluna em 4 ossos ao longo de +Y (a cabeca fica em -Y); o corpo e pesado entre eles para dobrar suavemente.
COLUNA = [('corpo1', -0.62, -0.20), ('corpo2', -0.20, 0.22), ('corpo3', 0.22, 0.58), ('corpo4', 0.58, 1.00)]
OSSOS = []
pai = None
for nome, y0, y1 in COLUNA:
    OSSOS.append((nome, (0, y0, ALTURA), (0, y1, ALTURA), pai))
    pai = nome

for lado, sufixo in ((1, 'd'), (-1, 'e')):
    OSSOS.append((f'peito_{sufixo}', (lado * 0.20, -0.22, ALTURA - 0.1), (lado * 0.62, 0.02, ALTURA - 0.2), 'corpo1'))

arm_dados = bpy.data.armatures.new('Tubarao')
arm = bpy.data.objects.new('Tubarao', arm_dados)
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
    if mat is not None:
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


def barbatana(osso, mat, base, altura, largura, inclinacao):
    """Barbatana triangular e fina: cone achatado em X, com a ponta inclinada para tras (ou para baixo, se inclinacao > pi/2)."""
    direcao = Vector((0, -math.sin(inclinacao), math.cos(inclinacao)))
    centro = Vector(base) + direcao * altura / 2
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=largura, radius2=0, depth=altura, location=centro, rotation=(inclinacao, 0, 0))
    o = bpy.context.active_object
    o.scale = (0.13, 1.0, 1.0)

    return parte(o, osso, mat)


def cone(osso, mat, loc, raio, altura, rot, lados=4):
    bpy.ops.mesh.primitive_cone_add(vertices=lados, radius1=raio, radius2=0, depth=altura, location=loc, rotation=rot)

    return parte(bpy.context.active_object, osso, mat, suave=False)


# Corpo: torpedo fusiforme feito de metabolas ao longo de Y (focinho -> pedunculo da cauda).
mb = bpy.data.metaballs.new('Corpo')
mb.resolution = 0.03
mb.render_resolution = 0.03
mb.threshold = 0.6
corpo_obj = bpy.data.objects.new('Corpo', mb)
cena.collection.objects.link(corpo_obj)


def blob(loc, raio, sx=1.0, sy=1.0, sz=1.0, rigidez=2.0):
    e = mb.elements.new(type='ELLIPSOID')
    e.co = Vector(loc)
    e.radius = raio
    e.size_x, e.size_y, e.size_z = sx, sy, sz
    e.stiffness = rigidez


blob((0, -0.66, ALTURA), 0.17, 0.9, 1.5, 0.85)    # focinho
blob((0, -0.34, ALTURA), 0.27, 1.0, 1.8, 1.0)     # cabeca e branquias
blob((0, 0.03, ALTURA), 0.30, 1.0, 1.9, 1.08)     # tronco (mais alto)
blob((0, 0.42, ALTURA), 0.21, 0.8, 1.9, 0.92)     # lombo
blob((0, 0.70, ALTURA), 0.14, 0.6, 1.8, 0.85)     # pedunculo da cauda
blob((0, 0.90, ALTURA), 0.10, 0.5, 1.7, 0.75)     # base da cauda

cena.frame_set(1)
avaliado = corpo_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
malha_corpo = bpy.data.meshes.new_from_object(avaliado)
bpy.data.objects.remove(corpo_obj)
corpo_obj = bpy.data.objects.new('Corpo', malha_corpo)
cena.collection.objects.link(corpo_obj)

for m in (AZUL, BRANCO):
    corpo_obj.data.materials.append(m)

# Barriga branca: a divisa fica abaixo da linha central e ondula de leve, como no tubarao-branco.
for poligono in corpo_obj.data.polygons:
    x, y, z = poligono.center
    divisa = ALTURA - 0.03 + 0.025 * math.sin(y * 9.0) - 0.05 * max(0.0, y - 0.45)
    poligono.material_index = 1 if z < divisa else 0

# Pesos suaves entre os ossos da coluna, pela posicao em Y.
bpy.context.view_layer.objects.active = corpo_obj
corpo_obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth()
centros = [(nome, (y0 + y1) / 2) for nome, y0, y1 in COLUNA]
grupos = {nome: corpo_obj.vertex_groups.new(name=nome) for nome, _ in centros}

for v in corpo_obj.data.vertices:
    y = v.co.y

    if y <= centros[0][1]:
        grupos[centros[0][0]].add([v.index], 1.0, 'REPLACE')
    elif y >= centros[-1][1]:
        grupos[centros[-1][0]].add([v.index], 1.0, 'REPLACE')
    else:
        for (n0, y0), (n1, y1) in zip(centros, centros[1:]):
            if y0 <= y <= y1:
                t = (y - y0) / (y1 - y0)
                grupos[n0].add([v.index], 1.0 - t, 'REPLACE')
                grupos[n1].add([v.index], t, 'REPLACE')
                break

corpo_obj.select_set(False)
partes.append(corpo_obj)
print('triangulos do corpo:', sum(len(p.vertices) - 2 for p in corpo_obj.data.polygons))

# Cabeca: olhos pretos, narinas, fendas das branquias e a boca com fileira de dentes (embaixo do focinho).
for lado in (-1, 1):
    esfera('corpo1', PRETO, (lado * 0.16, -0.50, ALTURA + 0.045), (0.028, 0.028, 0.028), seg=10, aneis=7)
    esfera('corpo1', PRETO, (lado * 0.04, -0.80, ALTURA + 0.02), (0.01, 0.012, 0.01), seg=6, aneis=4)

    for k in range(5):
        esfera('corpo1' if k < 2 else 'corpo2', PRETO, (lado * 0.262 - lado * 0.004 * k, -0.30 + k * 0.045, ALTURA + 0.02),
               (0.006, 0.012, 0.07 - k * 0.006), seg=6, aneis=4)

esfera('corpo1', BOCA, (0, -0.55, ALTURA - 0.12), (0.13, 0.17, 0.014), seg=12, aneis=6)

for k in range(11):
    t = (k - 5) / 5.0
    x = t * 0.12
    y = -0.46 - 0.12 * (1 - t * t)
    cone('corpo1', DENTE, (x, y, ALTURA - 0.135), 0.014, 0.04, (math.pi, 0, 0), lados=3)

# Barbatanas: dorsal triangular, duas peitorais em foice e a cauda em meia-lua (lobo de cima maior).
barbatana('corpo2', BARBATANA, (0, -0.10, ALTURA + 0.02), 0.56, 0.15, -0.5)
barbatana('corpo3', BARBATANA, (0, 0.46, ALTURA + 0.05), 0.26, 0.07, -0.6)

for lado, sufixo in ((1, 'd'), (-1, 'e')):
    esfera(f'peito_{sufixo}', BARBATANA, (lado * 0.38, -0.12, ALTURA - 0.15), (0.24, 0.075, 0.012), seg=10, aneis=6,
           rot=(0.0, lado * 0.25, lado * 0.55))

barbatana('corpo4', BARBATANA, (0, 0.92, ALTURA + 0.01), 0.40, 0.10, -0.62)
barbatana('corpo4', BARBATANA, (0, 0.92, ALTURA - 0.01), 0.26, 0.08, math.pi + 0.55)

# ------------------------------------------------------------------ junta tudo em uma malha so
for o in partes:
    o.select_set(True)

bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.join()
malha = bpy.context.active_object
malha.name = 'TubaraoMalha'
malha.parent = arm
mod = malha.modifiers.new('Esqueleto', 'ARMATURE')
mod.object = arm

# ------------------------------------------------------------------ animacao "Swim" (30 quadros em laco)
FPS = 24
QUADROS = 30
cena.render.fps = FPS
cena.frame_start = 1
cena.frame_end = QUADROS + 1  # o ultimo quadro repete o primeiro: o laco fecha sem salto
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='POSE')

for pb in arm.pose.bones:
    pb.rotation_mode = 'XYZ'


def chave(osso, quadro, x=0.0, y=0.0, z=0.0):
    pb = arm.pose.bones[osso]
    pb.rotation_euler = (x, y, z)
    pb.keyframe_insert('rotation_euler', frame=quadro)


AMPLITUDES = (0.05, 0.10, 0.17, 0.30)

for q in range(QUADROS + 1):
    t = q / QUADROS * math.tau

    # Onda que viaja da cabeca para a cauda: quanto mais perto da cauda, maior a batida lateral.
    for i, (nome, _, _) in enumerate(COLUNA):
        chave(nome, q + 1, z=math.sin(t - i * 0.95) * AMPLITUDES[i])

    for lado, sufixo in ((1, 'd'), (-1, 'e')):
        chave(f'peito_{sufixo}', q + 1, y=lado * math.sin(t + 1.2) * 0.10, x=0.05)

bpy.ops.object.mode_set(mode='OBJECT')
acao = arm.animation_data.action
acao.name = 'Swim'

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
        k = 0.80 + 0.14 * luz + 0.06 * altura
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
    'lado': ((3.4, -0.02, 0.4), (0, 0.15, 0.3)),
    'tras': ((0.0, 3.6, 1.0), (0, 0.0, 0.3)),
    'tres_quartos': ((2.4, -2.2, 1.1), (0, 0.1, 0.3)),
}

for nome, (pos, alvo) in VISTAS.items():
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - cam.location).to_track_quat('-Z', 'Y').to_euler()

    for i, quadro in enumerate((1, 5, 9)):
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(pasta, f'tubarao-{nome}-{i}.png')
        bpy.ops.render.render(write_still=True)

print('PREVIEWS_OK')
