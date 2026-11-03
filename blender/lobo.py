"""
Lobo cinzento para o jogo, gerado pelo Blender (sem janela).

Uso:
    blender --background --factory-startup --python blender/lobo.py -- <pasta_de_saida> [--glb <arquivo.glb>]

Gera na pasta de saida as imagens de pre-visualizacao (lado, tras e 3/4, em tres momentos da corrida) e, com --glb,
exporta o modelo animado ("Run", 16 quadros, 24 fps, em laco) para o jogo.

Convencoes do jogo: o lobo OLHA PARA -Y no Blender (vira +Z no glTF), Z para cima, patas em z = 0.
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
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.95
    except Exception:
        pass
    return m

CINZA = material('pelo', (0.42, 0.41, 0.40))
ESCURO = material('manto', (0.20, 0.20, 0.21))
CLARO = material('claro', (0.80, 0.76, 0.68))
FOCINHO = material('focinho', (0.30, 0.27, 0.25))
OLHO = material('olho', (0.95, 0.68, 0.12))
PRETO = material('preto', (0.03, 0.03, 0.04))

# ------------------------------------------------------------------ esqueleto
# (nome, cabeca, cauda, pai). Patas de cima para baixo; cauda em cadeia; olha para -Y.
OSSOS = [
    ('raiz', (0, 0.08, 0.60), (0, -0.10, 0.62), None),
    ('cabeca', (0, -0.36, 0.68), (0, -0.62, 0.72), 'raiz'),
    ('cauda1', (0, 0.34, 0.62), (0, 0.52, 0.58), 'raiz'),
    ('cauda2', (0, 0.52, 0.58), (0, 0.70, 0.53), 'cauda1'),
    ('cauda3', (0, 0.70, 0.53), (0, 0.86, 0.47), 'cauda2'),
    ('cauda4', (0, 0.86, 0.47), (0, 1.00, 0.40), 'cauda3'),
]
PATAS = {}  # nome: (quadril, joelho, pe), cada um (x, y, z)
for lado, sufixo in ((1, 'f'), (-1, 'e')):
    PATAS['d' + sufixo] = ((lado * 0.095, -0.25, 0.58), (lado * 0.095, -0.27, 0.33), (lado * 0.095, -0.25, 0.04))
    # Patas de tras de lobo: coxa para a frente, jarrete (calcanhar) alto e para tras.
    PATAS['t' + sufixo] = ((lado * 0.105, 0.30, 0.58), (lado * 0.105, 0.22, 0.34), (lado * 0.105, 0.34, 0.04))

for nome, (quadril, joelho, pe) in PATAS.items():
    OSSOS.append((f'{nome}_cima', quadril, joelho, 'raiz'))
    OSSOS.append((f'{nome}_baixo', joelho, pe, f'{nome}_cima'))

arm_dados = bpy.data.armatures.new('Lobo')
arm = bpy.data.objects.new('Lobo', arm_dados)
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


def elipsoide_eixo(osso, mat, de, ate, raio, alongar=0.62, seg=12, aneis=8):
    """Elipsoide centrado entre `de` e `ate`, alongado ao longo do segmento (raio perpendicular `raio`)."""
    a, b = Vector(de), Vector(ate)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=aneis, radius=1, location=(a + b) / 2)
    o = bpy.context.active_object
    o.scale = (raio, raio, (b - a).length * alongar)
    o.rotation_mode = 'QUATERNION'
    o.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')

    return parte(o, osso, mat)


# Tronco: peito fundo, cintura estreita (barriga recolhida), quadril e pescoco grosso, tudo fundido em metabolas.
mb = bpy.data.metaballs.new('Tronco')
mb.resolution = 0.034
mb.render_resolution = 0.034
mb.threshold = 0.6
tronco_obj = bpy.data.objects.new('Tronco', mb)
cena.collection.objects.link(tronco_obj)


def blob(loc, raio, sx=1.0, sy=1.0, sz=1.0, rigidez=2.0):
    e = mb.elements.new(type='ELLIPSOID')
    e.co = Vector(loc)
    e.radius = raio
    e.size_x, e.size_y, e.size_z = sx, sy, sz
    e.stiffness = rigidez


blob((0, -0.20, 0.60), 0.27, 0.85, 1.2, 1.15)      # peito fundo
blob((0.09, -0.22, 0.56), 0.15, 0.8, 1.1, 1.2)     # ombro direito
blob((-0.09, -0.22, 0.56), 0.15, 0.8, 1.1, 1.2)    # ombro esquerdo
blob((0, 0.05, 0.58), 0.21, 0.9, 1.5, 0.95)        # cintura
blob((0, 0.30, 0.60), 0.24, 0.9, 1.1, 1.0)         # quadril
blob((0.10, 0.28, 0.54), 0.16, 0.8, 1.2, 1.2)      # coxa direita
blob((-0.10, 0.28, 0.54), 0.16, 0.8, 1.2, 1.2)     # coxa esquerda
blob((0, -0.36, 0.68), 0.19, 1.0, 1.3, 1.1)        # pescoco grosso, com a juba

# Gera a malha a partir das metabolas (sem depender de selecao) e descarta o objeto de metabolas.
cena.frame_set(1)
avaliado = tronco_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
malha_tronco = bpy.data.meshes.new_from_object(avaliado)
bpy.data.objects.remove(tronco_obj)
tronco_obj = bpy.data.objects.new('Tronco', malha_tronco)
cena.collection.objects.link(tronco_obj)

# Pintura do pelo: manto escuro no dorso, peito e barriga claros, cinza nos flancos (faces do proprio tronco).
for m in (CINZA, ESCURO, CLARO):
    tronco_obj.data.materials.append(m)

for poligono in tronco_obj.data.polygons:
    x, y, z = poligono.center
    indice = 0

    if z < 0.50 and -0.40 < y < 0.20:
        indice = 2  # barriga e peito claros
    elif z > 0.60 + 0.12 * abs(x) and -0.28 < y < 0.40:
        indice = 1  # manto escuro, em forma de sela
    elif y < -0.30 and z < 0.62:
        indice = 2  # babador claro da garganta

    poligono.material_index = indice

parte(tronco_obj, 'raiz', None)
print('triangulos do tronco:', sum(len(p.vertices) - 2 for p in tronco_obj.data.polygons))

# Cabeca de lobo: cranio, focinho comprido e estreito, bochechas claras com pelos, orelhas grandes e pontudas, olhos amendoados.
esfera('cabeca', CINZA, (0, -0.52, 0.73), (0.115, 0.14, 0.105))
esfera('cabeca', CINZA, (0, -0.66, 0.69), (0.068, 0.13, 0.062))              # focinho
esfera('cabeca', CLARO, (0, -0.665, 0.655), (0.055, 0.11, 0.036), seg=10, aneis=7)  # queixo e labios claros
esfera('cabeca', PRETO, (0, -0.785, 0.70), (0.032, 0.025, 0.026), seg=10, aneis=7)  # nariz
for lado in (-1, 1):
    esfera('cabeca', CLARO, (lado * 0.075, -0.56, 0.675), (0.045, 0.085, 0.04), seg=10, aneis=7)   # bochecha
    esfera('cabeca', CINZA, (lado * 0.07, -0.43, 0.68), (0.06, 0.09, 0.075), seg=10, aneis=7)      # juba lateral
    esfera('cabeca', OLHO, (lado * 0.062, -0.625, 0.745), (0.022, 0.026, 0.014), seg=10, aneis=7, rot=(0, lado * 0.45, 0))
    esfera('cabeca', PRETO, (lado * 0.064, -0.64, 0.745), (0.009, 0.01, 0.009), seg=8, aneis=6)
    cone('cabeca', CINZA, (lado * 0.075, -0.465, 0.855), 0.07, 0.19, (-0.12, lado * 0.22, 0))
    cone('cabeca', ESCURO, (lado * 0.075, -0.475, 0.85), 0.045, 0.14, (-0.12, lado * 0.22, 0))

# Cauda cheia, que cai para tras; a ponta e escura.
cauda = [('cauda1', (0, 0.34, 0.62), (0, 0.52, 0.58)), ('cauda2', (0, 0.52, 0.58), (0, 0.70, 0.53)),
         ('cauda3', (0, 0.70, 0.53), (0, 0.86, 0.47)), ('cauda4', (0, 0.86, 0.47), (0, 1.00, 0.40))]
# Uma peca unica e peluda (metabolas ao longo da cauda), mais grossa no meio e com a ponta escura; os pesos mudam
# aos poucos entre os ossos da cauda, entao ela ondula sem juntas aparentes.
mt = bpy.data.metaballs.new('Cauda')
mt.resolution = 0.03
mt.render_resolution = 0.03
mt.threshold = 0.6
cauda_obj = bpy.data.objects.new('Cauda', mt)
cena.collection.objects.link(cauda_obj)

for t, raio in ((0.0, 0.11), (0.15, 0.15), (0.32, 0.18), (0.5, 0.19), (0.68, 0.17), (0.84, 0.13), (1.0, 0.08)):
    e = mt.elements.new(type='ELLIPSOID')
    ponto = Vector((0, 0.34 + 0.66 * t, 0.62 - 0.22 * t - 0.05 * math.sin(t * math.pi)))
    e.co = ponto
    e.radius = raio
    e.size_x, e.size_y, e.size_z = 0.62, 1.1, 0.7
    e.stiffness = 2.0

cena.frame_set(1)
avaliado_c = cauda_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
malha_c = bpy.data.meshes.new_from_object(avaliado_c)
bpy.data.objects.remove(cauda_obj)
cauda_obj = bpy.data.objects.new('Cauda', malha_c)
cena.collection.objects.link(cauda_obj)

for m in (CINZA, ESCURO, CLARO):
    cauda_obj.data.materials.append(m)

for poligono in cauda_obj.data.polygons:
    x, y, z = poligono.center
    ideal = 0.62 - 0.22 * ((y - 0.34) / 0.66)
    indice = 0

    if y > 0.90:
        indice = 1  # ponta escura
    elif z < ideal - 0.07 and y < 0.80:
        indice = 2  # parte de baixo, mais clara

    poligono.material_index = indice

bpy.context.view_layer.objects.active = cauda_obj
cauda_obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth()
ossos_cauda = [(o[0], (o[1][1] + o[2][1]) / 2) for o in OSSOS if o[0].startswith('cauda')]
grupos_c = {nome: cauda_obj.vertex_groups.new(name=nome) for nome, _ in ossos_cauda}

for v in cauda_obj.data.vertices:
    y = v.co.y

    if y <= ossos_cauda[0][1]:
        grupos_c[ossos_cauda[0][0]].add([v.index], 1.0, 'REPLACE')
    elif y >= ossos_cauda[-1][1]:
        grupos_c[ossos_cauda[-1][0]].add([v.index], 1.0, 'REPLACE')
    else:
        for (n0, y0), (n1, y1) in zip(ossos_cauda, ossos_cauda[1:]):
            if y0 <= y <= y1:
                k = (y - y0) / (y1 - y0)
                grupos_c[n0].add([v.index], 1.0 - k, 'REPLACE')
                grupos_c[n1].add([v.index], k, 'REPLACE')
                break

cauda_obj.select_set(False)
partes.append(cauda_obj)

# Patas: coxa/ombro com musculo, canela fina e clara, pata larga.
for nome, (quadril, joelho, pe) in PATAS.items():
    traseira = nome[0] == 't'
    q, j, f = Vector(quadril), Vector(joelho), Vector(pe)
    cilindro(f'{nome}_cima', CINZA, tuple(q), tuple(j), 0.088 if traseira else 0.072, 0.05)
    musculo = q.lerp(j, 0.30)
    esfera(f'{nome}_cima', CINZA, tuple(musculo), (0.075, 0.12, 0.13) if traseira else (0.065, 0.095, 0.115), seg=12, aneis=8)
    esfera(f'{nome}_cima', CINZA, tuple(j), (0.055, 0.055, 0.055), seg=10, aneis=7)
    cilindro(f'{nome}_baixo', CLARO, tuple(j), (f.x, f.y, f.z + 0.03), 0.052, 0.036)
    esfera(f'{nome}_baixo', CLARO, (f.x, f.y - 0.03, f.z + 0.005), (0.056, 0.10, 0.042), seg=10, aneis=7)

# ------------------------------------------------------------------ junta tudo em uma malha so
for o in partes:
    o.select_set(True)

bpy.context.view_layer.objects.active = partes[0]
bpy.ops.object.join()
malha = bpy.context.active_object
malha.name = 'LoboMalha'
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

# Fase de cada pata: o galope do lobo junta as patas dianteiras e depois as traseiras.
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
    'lado': ((3.5, -0.02, 0.5), (0, 0, 0.42)),
    'tras': ((0.0, 3.8, 1.0), (0, -0.05, 0.42)),
    'tres_quartos': ((2.4, -2.2, 1.2), (0, 0, 0.42)),
}

for nome, (pos, alvo) in VISTAS.items():
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - cam.location).to_track_quat('-Z', 'Y').to_euler()

    for i, quadro in enumerate((1, 5, 9)):
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(pasta, f'lobo-{nome}-{i}.png')
        bpy.ops.render.render(write_still=True)

print('PREVIEWS_OK')
