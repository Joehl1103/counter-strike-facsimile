"""Author the AK/hand pilot in Blender and export a composed, textured glTF.

Coordinates below are game coordinates: X right, Y up, forward toward -Z.
The asset is authored together; the game applies only its single mounting root.
"""
import bpy
import bmesh
import json
import math
from pathlib import Path
from mathutils import Matrix, Vector

PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / 'assets/source/viewmodels'
OUTPUT = PROJECT / 'outputs/cs16/recovery/ak-pilot'
OUTPUT.mkdir(parents=True, exist_ok=True)
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
MOUNT_POSITION = (0.43, -0.34, -0.59)
MOUNT_ROTATION = (0.08, 0.14, 0)
MOUNT_SCALE = 0.82
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

atlas = bpy.data.images.load(str(PROJECT / 'public/assets/viewmodels/recovery-material-atlas-v2.png'))
material = bpy.data.materials.new('AK painted walnut steel skin leather')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = 0.88
shader.inputs['Metallic'].default_value = 0.0
texture = material.node_tree.nodes.new('ShaderNodeTexImage')
texture.image = atlas
material.node_tree.links.new(texture.outputs['Color'], shader.inputs['Base Color'])

# Atlas quadrants use glTF/Blender UV coordinates, whose origin is bottom left.
REGIONS = {'wood': (0, .5), 'metal': (.5, .5), 'skin': (0, 0), 'glove': (.5, 0)}
weapon_parts = []

def point(value):
    return Vector((value[0], -value[2], value[1]))


def game_point(value):
    return Vector((value[0], value[2], -value[1]))


def transform(position, rotation, scale=1):
    rotation_matrix = (Matrix.Rotation(rotation[0], 4, 'X') @
                       Matrix.Rotation(rotation[1], 4, 'Y') @
                       Matrix.Rotation(rotation[2], 4, 'Z'))
    game_matrix = Matrix.Translation(Vector(position)) @ rotation_matrix @ Matrix.Scale(scale, 4)
    return C @ game_matrix @ C.inverted()


def apply_uv(obj, kind, axis='z'):
    uv = obj.data.uv_layers.new(name='Painted atlas')
    origin = REGIONS[kind]
    coordinates = [game_point(vertex.co) for vertex in obj.data.vertices]
    minimum = [min(vertex[index] for vertex in coordinates) for index in range(3)]
    maximum = [max(vertex[index] for vertex in coordinates) for index in range(3)]
    for polygon in obj.data.polygons:
        normal = game_point(polygon.normal)
        normal_axis = max(range(3), key=lambda index: abs(normal[index]))
        axes = [index for index in range(3) if index != normal_axis]
        if axis == 'z' and 2 in axes:
            axes.remove(2)
            axes.append(2)
        for loop_index in polygon.loop_indices:
            coordinate = coordinates[obj.data.loops[loop_index].vertex_index]
            local_uv = [(coordinate[index] - minimum[index]) / max(.0001, maximum[index] - minimum[index]) for index in axes]
            uv.data[loop_index].uv = (origin[0] + .015 + local_uv[0] * .47,
                                       origin[1] + .015 + local_uv[1] * .47)
    obj.data.materials.append(material)


def mesh_object(name, vertices, faces, kind='metal', bevel=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata([point(vertex) for vertex in vertices], [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    mesh = bmesh.new()
    mesh.from_mesh(data)
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    mesh.to_mesh(data)
    mesh.free()
    if bevel:
        modifier = obj.modifiers.new('Machined edge chamfers', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 1
        modifier.affect = 'EDGES'
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    apply_uv(obj, kind)
    weapon_parts.append(obj)
    return obj


def extrusion(name, profile, width, kind='metal', bevel=.002, offset_x=0):
    vertices = [(x + offset_x, y, z) for x in [-width / 2, width / 2] for z, y in profile]
    size = len(profile)
    faces = [tuple(range(size - 1, -1, -1)), tuple(range(size, size * 2))]
    faces += [(index, (index + 1) % size, (index + 1) % size + size, index + size) for index in range(size)]
    return mesh_object(name, vertices, faces, kind, bevel)


def loft(name, sections, kind='metal', sides=10, bevel=0):
    # Each ring explicitly controls the cross section along the longitudinal axis.
    vertices = []
    for depth, center_y, radius_x, radius_y in sections:
        for index in range(sides):
            angle = index * math.tau / sides
            vertices.append((math.cos(angle) * radius_x, center_y + math.sin(angle) * radius_y, depth))
    faces = [tuple(range(sides - 1, -1, -1)), tuple(range((len(sections) - 1) * sides, len(sections) * sides))]
    for ring in range(len(sections) - 1):
        for index in range(sides):
            following = (index + 1) % sides
            faces.append((ring * sides + index, ring * sides + following, (ring + 1) * sides + following, (ring + 1) * sides + index))
    return mesh_object(name, vertices, faces, kind, bevel)


def strip(name, points, width, thickness, side):
    vertices = []
    for depth, height in points:
        vertices += [(side - thickness / 2, height, depth - width / 2),
                     (side + thickness / 2, height, depth - width / 2),
                     (side + thickness / 2, height, depth + width / 2),
                     (side - thickness / 2, height, depth + width / 2)]
    faces = [(0, 3, 2, 1), tuple(range(len(vertices) - 4, len(vertices)))]
    for ring in range(len(points) - 1):
        for corner in range(4):
            faces.append((ring * 4 + corner, ring * 4 + (corner + 1) % 4,
                          (ring + 1) * 4 + (corner + 1) % 4, (ring + 1) * 4 + corner))
    return mesh_object(name, vertices, faces)


# Receiver is stamped sheet steel with a stepped lower edge and a crowned cover.
extrusion('Stamped receiver', [(-.24, .057), (.20, .052), (.225, .028), (.218, -.068), (.038, -.072), (-.018, -.092), (-.19, -.084), (-.24, -.053)], .137, bevel=.003)
loft('Crowned dust cover', [(-.205, .052, .067, .036), (-.19, .055, .069, .039), (.17, .052, .065, .035), (.205, .046, .059, .024)], sides=12)
# Narrow cover rim and stamped side plate keep the broad receiver readable.
for side in [-1, 1]:
    extrusion('Receiver lower folded edge', [(-.22,-.058),(.19,-.06),(.19,-.073),(-.19,-.084)], .008, offset_x=side*.07)
    extrusion('Receiver stamped depression', [(-.15,.01),(-.045,.007),(-.055,-.044),(-.145,-.048)], .004, offset_x=side*.071, bevel=.001)
    for depth in [-.19,-.16,.095,.14]:
        extrusion('Receiver rivet', [(depth-.005,-.034),(depth-.005,-.024),(depth+.005,-.023),(depth+.005,-.034)], .006, offset_x=side*.074, bevel=.002)
extrusion('Selector lever', [(.155,.015),(.17,.001),(-.05,-.022),(-.065,-.015)], .009, offset_x=.076, bevel=.001)
extrusion('Charging handle', [(-.155,.035),(-.11,.036),(-.10,.025),(-.15,.023)], .11, offset_x=.04)

# Shaped furniture; the butt is a tapered shoulder piece, outside the idle frame.
loft('Walnut lower handguard', [(-.555,-.008,.045,.045),(-.532,-.01,.071,.065),(-.29,-.01,.075,.062),(-.25,-.007,.06,.05)], 'wood', sides=10)
loft('Walnut upper gas cover', [(-.53,.065,.025,.024),(-.51,.069,.036,.031),(-.30,.069,.036,.031),(-.278,.064,.027,.024)], 'wood', sides=10)
for depth in [-.545,-.274]:
    loft('Handguard retaining band', [(depth-.008,-.002,.067,.059),(depth+.008,-.002,.067,.059)], sides=10)
loft('Barrel', [(-.93,.006,.018,.018),(-.60,.006,.021,.021),(-.51,.006,.026,.026)], sides=12)
loft('Gas piston tube', [(-.69,.062,.019,.019),(-.52,.067,.021,.021)], sides=10)
extrusion('Gas block', [(-.705,.019),(-.69,.08),(-.65,.085),(-.63,.016)], .053, bevel=.002)
loft('Slant muzzle brake', [(-.971,.006,.024,.025),(-.923,.006,.025,.025)], sides=10)
# An actual annular crown with a recessed bore instead of a capped cylinder.
vertices=[]
for depth,radius in [(-.972,.025),(-.972,.013),(-.95,.013)]:
    vertices += [(math.cos(index*math.tau/12)*radius,.006+math.sin(index*math.tau/12)*radius,depth) for index in range(12)]
faces=[]
for ring in range(2):
    for index in range(12):
        following=(index+1)%12
        faces.append((ring*12+index,ring*12+following,(ring+1)*12+following,(ring+1)*12+index))
mesh_object('Muzzle crown and recessed bore',vertices,faces)
for side in [-1,1]:
    extrusion('Front sight protective ear',[(-.84,.018),(-.838,.112),(-.817,.116),(-.812,.085),(-.811,.022)],.013,offset_x=side*.027)
extrusion('Front sight post',[(-.837,.026),(-.833,.101),(-.825,.101),(-.821,.026)],.009)
extrusion('Rear sight ramp',[(-.295,.063),(-.25,.131),(-.191,.128),(-.178,.073)],.065,bevel=.002)
for side in [-1,1]:
    extrusion('Rear sight notch ear',[(-.198,.119),(-.198,.139),(-.183,.139),(-.182,.114)],.013,offset_x=side*.024,bevel=.001)
loft('Walnut shoulder stock',[(.20,-.022,.038,.045),(.26,-.045,.041,.064),(.30,-.056,.045,.072)],'wood',sides=8)
# Only the stock neck belongs to the first-person crop; the world mesh retains the full stock.
extrusion('Walnut pistol grip',[(.055,-.073),(.139,-.077),(.18,-.28),(.093,-.293),(.065,-.235)],.077,'wood',.006)
# Trigger guard is an open swept strap following a hand-authored contour.
strip('Trigger guard',[(-.052,-.079),(-.044,-.14),(.032,-.165),(.079,-.124),(.077,-.073)],.008,.046,0)
extrusion('Trigger',[(-.008,-.078),(.012,-.081),(.012,-.113),(-.005,-.126),(-.012,-.123),(-.001,-.1)],.012,bevel=.001)
# Longitudinal magazine silhouette and ribs follow one curved contour.
magazine_profile=[(-.215,-.069),(-.065,-.069),(-.071,-.17),(-.108,-.281),(-.173,-.407),(-.225,-.47),(-.342,-.414),(-.292,-.333),(-.249,-.231),(-.224,-.135)]
extrusion('Curved steel magazine',magazine_profile,.095,bevel=.004)
for side in [-1,1]:
    for offset in [0,.037,.074]:
        strip('Magazine pressed reinforcement',[(-.20+offset,-.11),(-.214+offset,-.20),(-.248+offset,-.30),(-.299+offset,-.395)],.006,.004,side*.051)
extrusion('Magazine baseplate',[(-.342,-.408),(-.221,-.463),(-.23,-.479),(-.353,-.425)],.105,bevel=.002)

# Consolidate the firearm into a single atlas draw with retained part metadata.
bpy.ops.object.select_all(action='DESELECT')
for obj in weapon_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active=weapon_parts[0]
bpy.ops.object.join()
weapon=bpy.context.object
weapon.name='authored-ak-weapon'
weapon['primaryWeaponGeometry']=True
weapon['authoredAsset']='ak-pilot-v1'


def author_arm(source):
    side=source['handedness']
    values=source['positions']
    vertices=[point(values[index:index+3]) for index in range(0,len(values),3)]
    indices=source['indices']
    faces=[indices[index:index+3] for index in range(0,len(indices),3)]
    data=bpy.data.meshes.new(f'{side} hand and continuous forearm')
    data.from_pydata(vertices,[],faces)
    data.update()
    obj=bpy.data.objects.new(f'authored-{side}-viewmodel-arm',data)
    bpy.context.collection.objects.link(obj)
    mesh=bmesh.new();mesh.from_mesh(data)
    bmesh.ops.remove_doubles(mesh,verts=list(mesh.verts),dist=.00003)
    # Cut at the anatomical wrist, then extrude that exact boundary into the arm.
    bmesh.ops.bisect_plane(mesh,geom=list(mesh.verts)+list(mesh.edges)+list(mesh.faces),dist=.00001,plane_co=point((0,-.042,0)),plane_no=point((0,1,0)),clear_inner=True)
    boundary=[vertex for vertex in mesh.verts if any(edge.is_boundary for edge in vertex.link_edges) and abs(game_point(vertex.co).y+.042)<.0002]
    boundary.sort(key=lambda vertex:math.atan2(game_point(vertex.co).z,game_point(vertex.co).x))
    if len(boundary)<8:
        raise RuntimeError(f'{side} wrist loop did not survive the crop: {len(boundary)}')
    # Broaden the thumb/palm and keep a deliberate wrist taper.
    for vertex in mesh.verts:
        coordinate=game_point(vertex.co);coordinate.x*=1.09;coordinate.z*=1.06;vertex.co=point(coordinate)
    previous=boundary
    outward=-1 if side=='left' else 1
    # Continuous cross sections describe radius/ulna planes, not a separate tube.
    for depth,radius_x,radius_z,offset in [(-.075,.046,.041,0),(-.106,.048,.041,.004),(-.15,.047,.039,.008),(-.24,.062,.049,.026),(-.38,.086,.064,.09),(-.57,.103,.077,.18),(-.82,.125,.091,.30),(-1.08,.14,.105,.40)]:
        ring=[]
        for index,original in enumerate(boundary):
            angle=math.atan2(game_point(original.co).z,game_point(original.co).x)
            # Flatten the dorsal plane and retain a subtle asymmetric muscle mass.
            x=math.cos(angle)*radius_x+outward*offset
            z=math.sin(angle)*radius_z+.009*(1+math.cos(angle))
            ring.append(mesh.verts.new(point((x,depth,z))))
        for index in range(len(ring)):
            following=(index+1)%len(ring)
            mesh.faces.new((previous[index],previous[following],ring[following],ring[index]))
        previous=ring
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces))
    mesh.to_mesh(data);mesh.free();data.update()
    uv=data.uv_layers.new(name='Skin and fingerless glove unwrap')
    data.materials.append(material)
    landmarks=source['landmarks']
    tips=[Vector(joints[-1]) for joints in landmarks.values()]
    for polygon in data.polygons:
        centroid=game_point(polygon.center)
        # Exposed distal fingertips and bare forearm; the palm/wrist remain leather.
        skin=centroid.y<-.079 or min((centroid-tip).length for tip in tips)<.022
        origin=REGIONS['skin' if skin else 'glove']
        for loop_index in polygon.loop_indices:
            coordinate=game_point(data.vertices[data.loops[loop_index].vertex_index].co)
            if coordinate.y<-.042:
                side_shift=outward*max(0,(-coordinate.y-.15))*.43
                horizontal=(math.atan2(coordinate.z-.009,coordinate.x-side_shift)/math.tau+.5)
                vertical=min(1,max(0,(-coordinate.y-.079)/1.001))
            else:
                horizontal=(coordinate.x+.09)/.18
                vertical=(coordinate.y+.11)/.24
            uv.data[loop_index].uv=(origin[0]+.015+min(1,max(0,horizontal))*.47,origin[1]+.015+min(1,max(0,vertical))*.47)
        polygon.use_smooth=True
    pose=source['pose']
    position=(-.082,-.105,-.43) if side=='left' else (.039,-.205,.057)
    rotation=pose['rotation']
    scale=1.06 if side=='left' else 1.0
    obj.matrix_world=transform(position,rotation,scale)
    obj['viewmodelArm']=True
    obj['viewmodelHandedness']=side
    obj['viewmodelGrip']=pose['grip']
    obj['visualOnly']=True
    return obj

arms=[author_arm(source) for source in json.loads((SOURCE/'posed-hands.json').read_text())]
asset_objects=[weapon,*arms]
# Triangulate for stable game budgets; UVs and smooth hand normals survive export.
counts={}
for obj in asset_objects:
    obj.data.calc_loop_triangles()
    counts[obj.name]=len(obj.data.loop_triangles)
assert counts[weapon.name]<=3500,counts
assert sum(counts[obj.name] for obj in arms)<=4000,counts
bpy.ops.object.select_all(action='DESELECT')
for obj in asset_objects: obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(PROJECT/'public/assets/viewmodels/ak-pilot.glb'),use_selection=True,export_extras=True,export_animations=False)
# Save the editable source with camera/mount visible for repeatable review.
assembly=bpy.data.objects.new('AK complete first person composition',None)
bpy.context.collection.objects.link(assembly)
for obj in asset_objects:
    obj.parent=assembly
assembly.matrix_world=transform(MOUNT_POSITION,MOUNT_ROTATION,MOUNT_SCALE)
camera_data=bpy.data.cameras.new('Fixed 74 degree game projection')
camera=bpy.data.objects.new('Fixed 74 degree game projection',camera_data)
bpy.context.collection.objects.link(camera)
camera.rotation_euler=Vector((0,1,0)).to_track_quat('-Z','Y').to_euler()
camera.data.sensor_fit='VERTICAL';camera.data.angle=math.radians(74)
camera.data.clip_start=.05
bpy.context.scene.camera=camera
world=bpy.context.scene.world
world.use_nodes=True
world.node_tree.nodes.get('Background').inputs[0].default_value=(.33,.43,.43,1)
world.node_tree.nodes.get('Background').inputs[1].default_value=.8
light_data=bpy.data.lights.new('Soft daylight','AREA');light_data.energy=180;light_data.shape='DISK';light_data.size=4
light=bpy.data.objects.new('Soft daylight',light_data);bpy.context.collection.objects.link(light);light.location=(-1,-1,3);light.rotation_euler=(Vector((0,.8,-.3))-light.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=960;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(OUTPUT/'ak-idle-authored.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'ak-pilot.blend'))
bpy.ops.render.render(write_still=True)
(OUTPUT/'geometry.json').write_text(json.dumps({'triangles':counts,'wrist':'shared boundary extruded into forearm','mount':{'position':MOUNT_POSITION,'rotation':MOUNT_ROTATION,'scale':MOUNT_SCALE}},indent=2)+'\n')
print(json.dumps(counts))
