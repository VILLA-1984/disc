"""
Humano realista para o jogo, gerado no Blender (sem janela) a partir do MPFB2 (MakeHuman Plugin For Blender, GPL; os
recursos usados - malha, pele, cabelos, roupas - sao CC0).

Uso:
    blender --background --factory-startup --python blender/humano.py -- <pasta_de_saida> <id> [--glb <arquivo.glb>]

<id> e a chave de um personagem em PERSONAGENS (abaixo). Gera as imagens de pre-visualizacao e, com --glb, o modelo com
esqueleto e a animacao "Walk" (24 quadros, 24 fps, em laco).

Requisitos: o add-on MPFB2 e o pacote de recursos "makehuman_system_assets" (CC0) instalados no Blender.
O corpo usa a malha de baixo poligono (proxy de ~1,6 mil vertices) para o jogo rodar bem no celular.
O modelo olha para -Y no Blender (vira +Z no glTF, como os animais), Z para cima, pes em z = 0.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

# ------------------------------------------------------------------ personagens
# genero: 0 mulher, 1 homem. raca: pesos de africano/asiatico/caucasiano. pele: pasta em skins/. cabelo: pasta em hair/
# (None = careca). roupa: peca de cima e de baixo coloridas de forma lisa (o pacote traz um logo estampado).
PERSONAGENS = {
    'ana': dict(nome='Ana', genero=0.0, idade=0.45, peso=0.38, altura=0.55, musculo=0.45, raca=(1.0, 0.0, 0.0),
                pele='young_african_female', cabelo='afro01', cor_cabelo=(0.04, 0.03, 0.025), proxy='female1605',
                roupa='female_casualsuit01', cor_roupa=(0.94, 0.54, 0.24), cor_calca=(0.05, 0.17, 0.31)),
}

# ------------------------------------------------------------------ argumentos
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
pasta = args[0] if args else os.getcwd()
chave = args[1] if len(args) > 1 and not args[1].startswith('--') else 'ana'
glb = args[args.index('--glb') + 1] if '--glb' in args else None
P = PERSONAGENS[chave]
os.makedirs(pasta, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module='bl_ext.user_default.mpfb')

from bl_ext.user_default.mpfb.services.humanservice import HumanService  # noqa: E402
from bl_ext.user_default.mpfb.services.locationservice import LocationService  # noqa: E402
from bl_ext.user_default.mpfb.services.targetservice import TargetService  # noqa: E402

cena = bpy.context.scene
dados = LocationService.get_user_data()
dados_mpfb = LocationService.get_mpfb_data()


def arq(*partes):
    return os.path.join(dados, *partes)


# ------------------------------------------------------------------ corpo
info = TargetService.get_default_macro_info_dict()
info.update(gender=P['genero'], age=P['idade'], muscle=P['musculo'], weight=P['peso'], height=P['altura'], proportions=0.6)
info['race'] = {'african': P['raca'][0], 'asian': P['raca'][1], 'caucasian': P['raca'][2]}
basemesh = HumanService.create_human(macro_detail_dict=info, mask_helpers=False, detailed_helpers=False, extra_vertex_groups=False,
                                   feet_on_ground=False)
esqueleto = HumanService.add_builtin_rig(basemesh, 'game_engine', import_weights=True)
print('OSSOS', len(esqueleto.data.bones))


def vestir(caminho, tipo, **extra):
    return HumanService.add_mhclo_asset(caminho, basemesh, asset_type=tipo, material_type='GAMEENGINE', set_up_rigging=True,
                                        interpolate_weights=True, import_weights=True, **extra)


corpo = vestir(arq('proxymeshes', P['proxy'], P['proxy'] + '.proxy'), 'Proxymeshes')
HumanService.set_character_skin(arq('skins', P['pele'], P['pele'] + '.mhmat'), basemesh, bodyproxy=corpo, skin_type='GAMEENGINE')
roupa = vestir(arq('clothes', P['roupa'], P['roupa'] + '.mhclo'), 'Clothes')
sapato = vestir(arq('clothes', 'shoes02', 'shoes02.mhclo'), 'Clothes')
olhos = vestir(arq('eyes', 'low-poly', 'low-poly.mhclo'), 'Eyes')
sobrancelha = vestir(arq('eyebrows', 'eyebrow001', 'eyebrow001.mhclo'), 'Eyebrows')
cilios = vestir(arq('eyelashes', 'eyelashes01', 'eyelashes01.mhclo'), 'Eyelashes')
cabelo = vestir(arq('hair', P['cabelo'], P['cabelo'] + '.mhclo'), 'Hair') if P['cabelo'] else None
print('PARTES', [(o.name, len(o.data.polygons)) for o in (corpo, roupa, sapato, olhos, sobrancelha, cilios, cabelo) if o])
print('OSSOS_NOMES', [b.name for b in esqueleto.data.bones])
print('OBJETOS', [(o.name, o.type, o.parent.name if o.parent else None) for o in bpy.data.objects])

# ------------------------------------------------------------------ pesos da roupa copiados dos vertices mais proximos do corpo
# Os pesos que o MPFB interpola para a calca e a camiseta arrastam a coxa junto com a canela quando o joelho dobra; copiar do
# corpo (que ja esta bem pesado) mantem cada perna e cada braco no seu osso.
from mathutils.kdtree import KDTree  # noqa: E402

ossos_nomes = {b.name for b in esqueleto.data.bones}
indice_osso = {g.index: g.name for g in corpo.vertex_groups if g.name in ossos_nomes}
# Uma arvore por lado do corpo: a parte de dentro da coxa direita nao pode "colar" na perna esquerda (esticaria uma folha de
# tecido entre as pernas quando elas se afastam).
arvores = {}

for lado_sinal in (1, -1):
    indices = [i for i, v in enumerate(corpo.data.vertices) if (corpo.matrix_world @ v.co).x * lado_sinal >= -0.004]
    arvore = KDTree(len(indices))

    for k, i in enumerate(indices):
        arvore.insert(corpo.matrix_world @ corpo.data.vertices[i].co, i)

    arvore.balance()
    arvores[lado_sinal] = arvore


def copiar_pesos(peca, vizinhos=3):
    for grupo in list(peca.vertex_groups):
        peca.vertex_groups.remove(grupo)

    grupos = {nome: peca.vertex_groups.new(name=nome) for nome in ossos_nomes}

    for v in peca.data.vertices:
        pesos = {}

        pos = peca.matrix_world @ v.co
        arvore = arvores[1 if pos.x >= 0 else -1]

        for _, i, dist in arvore.find_n(pos, vizinhos):
            k = 1.0 / (dist + 1e-4)

            for g in corpo.data.vertices[i].groups:
                if g.group in indice_osso:
                    pesos[indice_osso[g.group]] = pesos.get(indice_osso[g.group], 0.0) + g.weight * k

        melhores = sorted(pesos.items(), key=lambda kv: -kv[1])[:4]
        total = sum(w for _, w in melhores) or 1.0

        for nome, w in melhores:
            grupos[nome].add([v.index], w / total, 'REPLACE')


copiar_pesos(roupa)
copiar_pesos(sapato)

# ------------------------------------------------------------------ tira do corpo o que a roupa cobre (evita a pele furando o tecido)
import bmesh  # noqa: E402

COBERTOS = ('pelvis', 'spine_01', 'spine_02', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r')
nomes_por_indice = {g.index: g.name for g in corpo.vertex_groups if g.name in esqueleto.data.bones}


def osso_dominante(vertice):
    """Osso de maior peso do vertice (so os do esqueleto: o corpo tambem tem grupos auxiliares, como "body")."""
    pesos = [g for g in vertice.groups if g.group in nomes_por_indice]

    if not pesos:
        return None

    return nomes_por_indice[max(pesos, key=lambda g: g.weight).group]


zs = [v.co.z for v in corpo.data.vertices]
z_min, z_max = min(zs), max(zs)


def coberto(osso, centro):
    """Faces que a roupa esconde por completo; no colarinho e abaixo da manga a pele continua aparecendo."""
    if osso in COBERTOS:
        return True

    altura_relativa = (centro.z - z_min) / (z_max - z_min)

    if osso == 'spine_03':
        return altura_relativa < 0.78

    if osso in ('clavicle_l', 'clavicle_r'):
        return altura_relativa < 0.80

    if osso in ('upperarm_l', 'upperarm_r'):
        cima = esqueleto.data.bones[osso]
        eixo = cima.tail_local - cima.head_local
        t = (centro - cima.head_local).dot(eixo) / eixo.length_squared

        return t < 0.5

    return False


bm = bmesh.new()
bm.from_mesh(corpo.data)
dominantes = [osso_dominante(v) for v in corpo.data.vertices]
cobertos = [f for f in bm.faces if all(dominantes[v.index] is not None for v in f.verts)
            and all(coberto(dominantes[v.index], v.co) for v in f.verts)]
bmesh.ops.delete(bm, geom=cobertos, context='FACES')
bm.to_mesh(corpo.data)
bm.free()
print('FACES_DO_CORPO', len(corpo.data.polygons), 'removidas', len(cobertos))

# ------------------------------------------------------------------ materiais lisos (sem o logo estampado do pacote)
def principled(material):
    for no in material.node_tree.nodes:
        if no.type == 'BSDF_PRINCIPLED':
            return no

    return None


def cor_lisa(obj, rgb):
    """Troca a textura de cor por uma cor lisa; mantem so o canal de transparencia (cabelo, cilios) se houver."""
    for material in obj.data.materials:
        if material is None or not material.use_nodes:
            continue

        no = principled(material)
        entrada = no.inputs['Base Color']

        for ligacao in list(entrada.links):
            material.node_tree.links.remove(ligacao)

        entrada.default_value = (*rgb, 1)
        no.inputs['Roughness'].default_value = 0.85


def novo_material(nome, rgb, rugosidade=0.85):
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    no = principled(m)
    no.inputs['Base Color'].default_value = (*rgb, 1)
    no.inputs['Roughness'].default_value = rugosidade

    return m


# O esqueleto nasce no mesmo lugar da malha (pes abaixo da origem); aqui tudo sobe junto para os pes ficarem em z = 0.
pecas_todas = [o for o in bpy.data.objects if o.type == 'MESH']
subida = -min(v.co.z for o in pecas_todas if o.name != 'Human' for v in o.data.vertices)
print('SUBIDA', round(subida, 3))

for o in pecas_todas:
    o.data.transform(Matrix.Translation((0, 0, subida)))
    o.data.update()

bpy.context.view_layer.objects.active = esqueleto
bpy.ops.object.mode_set(mode='EDIT')

for osso in esqueleto.data.edit_bones:
    osso.head.z += subida
    osso.tail.z += subida

bpy.ops.object.mode_set(mode='OBJECT')

altura = max(v.co.z for v in corpo.data.vertices)
print('ALTURA', round(altura, 3))

# Roupa de duas cores: camiseta (acima da cintura) e calca (abaixo), por faixa de altura.
roupa.data.materials.clear()
roupa.data.materials.append(novo_material('camiseta', P['cor_roupa']))
roupa.data.materials.append(novo_material('calca', P['cor_calca']))

for poligono in roupa.data.polygons:
    poligono.material_index = 0 if poligono.center.z > altura * 0.58 else 1

sapato.data.materials.clear()
sapato.data.materials.append(novo_material('sapato', (0.10, 0.10, 0.12), 0.7))

if cabelo:
    cor_lisa(cabelo, P['cor_cabelo'])

# A roupa sobe alguns milimetros ao longo da normal, para a pele nao aparecer pelo tecido (as duas malhas quase se tocam).
for peca in (roupa, sapato):
    bpy.context.view_layer.objects.active = peca
    peca.data.update()

    for v in peca.data.vertices:
        v.co += v.normal * (0.006 if peca is roupa else 0.003)

# ------------------------------------------------------------------ junta as pecas, descarta o corpo de alta resolucao
bpy.ops.object.select_all(action='DESELECT')

for o in list(bpy.data.objects):
    if o.name == 'Human':
        bpy.data.objects.remove(o)

pecas = [o for o in bpy.data.objects if o.type == 'MESH']

for o in pecas:
    o.select_set(True)

bpy.context.view_layer.objects.active = corpo
bpy.ops.object.join()
malha = bpy.context.active_object
malha.name = P['nome'] + 'Malha'

for m in list(malha.modifiers):
    if m.type != 'ARMATURE':
        malha.modifiers.remove(m)

print('TRIANGULOS', sum(len(p.vertices) - 2 for p in malha.data.polygons), 'MATERIAIS', [m.name for m in malha.data.materials])

# ------------------------------------------------------------------ juntas nitidas (joelho, tornozelo e cotovelo)
# Os pesos do MPFB passam do osso de cima para o de baixo numa faixa longa e um pouco abaixo da articulacao; com o joelho
# dobrado isso estica o tecido numa fita. Aqui a divisa e refeita pela posicao real da articulacao, numa faixa curta.
def passo_suave(x):
    x = max(0.0, min(1.0, x))

    return x * x * (3.0 - 2.0 * x)


def afiar_junta(osso_cima, osso_baixo, meia_faixa):
    cima = esqueleto.data.bones[osso_cima]
    baixo = esqueleto.data.bones[osso_baixo]
    junta = esqueleto.matrix_world @ baixo.head_local
    eixo = ((esqueleto.matrix_world @ cima.tail_local) - (esqueleto.matrix_world @ cima.head_local)).normalized()
    g_cima = malha.vertex_groups[osso_cima]
    g_baixo = malha.vertex_groups[osso_baixo]
    mudados = 0

    for v in malha.data.vertices:
        w_cima = w_baixo = 0.0

        for g in v.groups:
            if g.group == g_cima.index:
                w_cima = g.weight
            elif g.group == g_baixo.index:
                w_baixo = g.weight

        total = w_cima + w_baixo

        if total < 1e-4:
            continue

        d = ((malha.matrix_world @ v.co) - junta).dot(-eixo)  # positivo do lado de baixo da junta (eixo aponta para baixo no braco/perna)
        parte_baixo = passo_suave(0.5 + d / (2.0 * meia_faixa))
        g_cima.add([v.index], total * (1.0 - parte_baixo), 'REPLACE')
        g_baixo.add([v.index], total * parte_baixo, 'REPLACE')
        mudados += 1

    return mudados


for sufixo in ('l', 'r'):
    n1 = afiar_junta('thigh_' + sufixo, 'calf_' + sufixo, 0.05)
    n2 = afiar_junta('calf_' + sufixo, 'foot_' + sufixo, 0.03)
    n3 = afiar_junta('upperarm_' + sufixo, 'lowerarm_' + sufixo, 0.04)
    print('JUNTAS', sufixo, n1, n2, n3)

# Texturas menores: a pele vai a 512 px e o resto a 256 (o personagem aparece pequeno na tela).
for imagem in bpy.data.images:
    if imagem.size[0] > 0 and imagem.users > 0:
        alvo = 512 if 'diffuse' in imagem.name.lower() or 'skin' in imagem.name.lower() else 256

        if max(imagem.size) > alvo:
            fator = alvo / max(imagem.size)
            imagem.scale(max(1, int(imagem.size[0] * fator)), max(1, int(imagem.size[1] * fator)))

# ------------------------------------------------------------------ animacao "Walk" (24 quadros em laco)
FPS = 24
QUADROS = 24
cena.render.fps = FPS
cena.frame_start = 1
cena.frame_end = QUADROS + 1
bpy.context.view_layer.objects.active = esqueleto
bpy.ops.object.mode_set(mode='POSE')

for pb in esqueleto.pose.bones:
    pb.rotation_mode = 'XYZ'


def centroide(osso):
    """Centro (no mundo) dos vertices da malha presos a `osso`, ja deformados: mede o que o jogo vai realmente ver."""
    indice = malha.vertex_groups[osso].index
    bpy.context.view_layer.update()
    avaliada = malha.evaluated_get(bpy.context.evaluated_depsgraph_get())
    soma = Vector((0, 0, 0))
    n = 0

    for v, ev in zip(malha.data.vertices, avaliada.data.vertices):
        if any(g.group == indice and g.weight > 0.5 for g in v.groups):
            soma += malha.matrix_world @ ev.co
            n += 1

    return soma / max(n, 1)


def eixo_para(osso, direcao):
    """Eixo local (0 X, 1 Y, 2 Z) e sinal que, ao girar o osso, levam a malha dele para `direcao` (vetor do mundo)."""
    pb = esqueleto.pose.bones[osso]
    pb.rotation_euler = (0, 0, 0)
    base = centroide(osso)
    melhor = (0, 1.0, 0.0)

    for eixo in range(3):
        angulos = [0.0, 0.0, 0.0]
        angulos[eixo] = 0.3
        pb.rotation_euler = tuple(angulos)
        ganho = (centroide(osso) - base).dot(Vector(direcao))

        if abs(ganho) > abs(melhor[2]):
            melhor = (eixo, 1.0 if ganho > 0 else -1.0, ganho)

    pb.rotation_euler = (0, 0, 0)

    return melhor[0], melhor[1]


FRENTE = (0, -1, 0)
TRAS = (0, 1, 0)
eixos = {}

for osso in ('thigh_l', 'thigh_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'upperarm_l', 'upperarm_r', 'lowerarm_l', 'lowerarm_r'):
    eixos[osso] = {'frente': eixo_para(osso, FRENTE), 'tras': eixo_para(osso, TRAS)}

# Bracos: descem do A-pose para junto do corpo (aducao), no sentido do plano de simetria.
for osso in ('upperarm_l', 'upperarm_r'):
    lado = 1 if centroide(osso).x > 0 else -1
    eixos[osso]['dentro'] = eixo_para(osso, (-lado, 0, 0))
    eixos[osso]['baixo'] = eixo_para(osso, (0, 0, -1))

print('EIXOS', eixos)


def girar(osso, quadro, ang, eixo_sinal):
    """Gira `osso` em `ang` radianos (positivo = no sentido dado por eixo_sinal=(eixo, sinal))."""
    pb = esqueleto.pose.bones[osso]
    v = [0.0, 0.0, 0.0]
    eixo, sinal = eixo_sinal
    v[eixo] += ang * sinal
    pb.rotation_euler = tuple(v)
    pb.keyframe_insert('rotation_euler', frame=quadro)


for q in range(QUADROS + 1):
    t = q / QUADROS * math.tau

    # Pernas: uma vai a frente enquanto a outra vai atras; o joelho dobra quando a perna passa por baixo do corpo.
    for sufixo, fase in (('l', 0.0), ('r', math.pi)):
        s = math.sin(t + fase)
        girar('thigh_' + sufixo, q + 1, s * 0.50, eixos['thigh_' + sufixo]['frente'])
        flexao = max(0.0, math.sin(t + fase + 1.0)) * 0.7
        girar('calf_' + sufixo, q + 1, flexao, eixos['calf_' + sufixo]['tras'])
        # Bracos em oposicao as pernas, descidos para junto do corpo.
        sb = math.sin(t + fase + math.pi)
        e = eixos['upperarm_' + sufixo]
        v = [0.0, 0.0, 0.0]

        for chave_eixo, ang in (('dentro', 0.30), ('baixo', 0.20)):
            v[e[chave_eixo][0]] += ang * e[chave_eixo][1]

        v[e['frente'][0]] += sb * 0.42 * e['frente'][1]
        pb = esqueleto.pose.bones['upperarm_' + sufixo]
        pb.rotation_euler = tuple(v)
        pb.keyframe_insert('rotation_euler', frame=q + 1)
        girar('lowerarm_' + sufixo, q + 1, 0.35 + max(0.0, -sb) * 0.35, eixos['lowerarm_' + sufixo]['frente'])

    # O corpo sobe e desce duas vezes por passada.
    esqueleto.pose.bones['Root'].location = (0, 0, -abs(math.cos(t)) * 0.025)
    esqueleto.pose.bones['Root'].keyframe_insert('location', frame=q + 1)

bpy.ops.object.mode_set(mode='OBJECT')
esqueleto.animation_data.action.name = 'Walk'

# ------------------------------------------------------------------ exportacao
if glb:
    for o in cena.objects:
        o.select_set(o in (esqueleto, malha))

    bpy.context.view_layer.objects.active = esqueleto
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_animations=True,
                              export_yup=True, export_apply=False, export_image_format='AUTO')
    print('GLB:', glb, os.path.getsize(glb), 'bytes')

# ------------------------------------------------------------------ pre-visualizacao
try:
    cena.render.engine = 'BLENDER_EEVEE'
except TypeError:
    cena.render.engine = 'BLENDER_EEVEE_NEXT'

cena.view_settings.view_transform = 'Standard'
cena.render.resolution_x = 420
cena.render.resolution_y = 600
cena.world = bpy.data.worlds.new('mundo')
cena.world.use_nodes = True
cena.world.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.9, 0.96, 1)
cena.world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
sol = bpy.data.objects.new('sol', bpy.data.lights.new('sol', 'SUN'))
cena.collection.objects.link(sol)
sol.data.energy = 2.0
sol.rotation_euler = (math.radians(50), 0, math.radians(30))
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
cena.collection.objects.link(cam)
cena.camera = cam
cam.data.lens = 60

VISTAS = {
    'lado': ((altura * 2.4, 0, altura * 0.5), (0, 0, altura * 0.5)),
    'tras': ((0, altura * 2.4, altura * 0.5), (0, 0, altura * 0.5)),
    'tres_quartos': ((altura * 1.7, -altura * 1.7, altura * 0.55), (0, 0, altura * 0.5)),
}

for nome, (pos, alvo) in VISTAS.items():
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(alvo) - cam.location).to_track_quat('-Z', 'Y').to_euler()

    for i, quadro in enumerate((1, 7, 13)):
        cena.frame_set(quadro)
        cena.render.filepath = os.path.join(pasta, f'humano-{nome}-{i}.png')
        bpy.ops.render.render(write_still=True)

print('PREVIEWS_OK')

# ------------------------------------------------------------------ retrato (busto, fundo transparente) para a tela de escolha
cena.render.film_transparent = True
cena.render.resolution_x = 440
cena.render.resolution_y = 560
cam.data.lens = 85
cam.location = Vector((0, -altura * 1.55, altura * 0.80))
cam.rotation_euler = (Vector((0, 0, altura * 0.77)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cena.frame_set(1)
cena.render.filepath = os.path.join(pasta, 'retrato.png')
bpy.ops.render.render(write_still=True)
print('RETRATO_OK')
