import { EXTERIOR_WALL_INNER_EDGE } from './scene-layout.ts';

export type PerimeterMasonryInstance = Readonly<{
  position: readonly [number, number, number];
  rotationY: number;
}>;

export type PerimeterMasonryBatch = Readonly<{
  kind: 'pilaster' | 'capital' | 'course';
  size: readonly [number, number, number];
  instances: readonly PerimeterMasonryInstance[];
}>;

export const PERIMETER_MASONRY_MAX_ADDED_DRAWS = 3;
export const PERIMETER_MASONRY_MAX_ADDED_TRIANGLES = 1_500;
export const PERIMETER_MASONRY_TRIANGLES_PER_BOX = 12;

const WALL_DETAIL_DEPTH = 0.16;
const PILASTER_RUN_POSITIONS = [-30, -18, -9, 9, 18, 30] as const;

const aroundPerimeter = (
  y: number,
  depth = WALL_DETAIL_DEPTH,
): PerimeterMasonryInstance[] => {
  const wallDetailCenter = EXTERIOR_WALL_INNER_EDGE + depth / 2;
  return [
    ...PILASTER_RUN_POSITIONS.flatMap((position) => [
      { position: [position, y, -wallDetailCenter], rotationY: 0 } as const,
      {
        position: [position, y, wallDetailCenter],
        rotationY: Math.PI,
      } as const,
    ]),
    ...PILASTER_RUN_POSITIONS.flatMap((position) => [
      {
        position: [-wallDetailCenter, y, position],
        rotationY: Math.PI / 2,
      } as const,
      {
        position: [wallDetailCenter, y, position],
        rotationY: -Math.PI / 2,
      } as const,
    ]),
  ];
};

const courseCenter = EXTERIOR_WALL_INNER_EDGE + WALL_DETAIL_DEPTH / 2;
const courseInstances: PerimeterMasonryInstance[] = [0.76, 4.72].flatMap(
  (y) => [
    { position: [0, y, -courseCenter], rotationY: 0 } as const,
    { position: [0, y, courseCenter], rotationY: Math.PI } as const,
    {
      position: [-courseCenter, y, 0],
      rotationY: Math.PI / 2,
    } as const,
    {
      position: [courseCenter, y, 0],
      rotationY: -Math.PI / 2,
    } as const,
  ],
);

export const PERIMETER_MASONRY_BATCHES: readonly PerimeterMasonryBatch[] =
  Object.freeze([
    Object.freeze({
      kind: 'pilaster',
      size: [0.76, 3.72, WALL_DETAIL_DEPTH] as const,
      instances: Object.freeze(aroundPerimeter(2.74)),
    }),
    Object.freeze({
      kind: 'capital',
      size: [1.02, 0.22, 0.19] as const,
      instances: Object.freeze([
        ...aroundPerimeter(0.92, 0.19),
        ...aroundPerimeter(4.56, 0.19),
      ]),
    }),
    Object.freeze({
      kind: 'course',
      size: [69.6, 0.24, WALL_DETAIL_DEPTH] as const,
      instances: Object.freeze(courseInstances),
    }),
  ]);

export const PERIMETER_MASONRY_ADDED_TRIANGLES =
  PERIMETER_MASONRY_BATCHES.reduce(
    (total, batch) =>
      total + batch.instances.length * PERIMETER_MASONRY_TRIANGLES_PER_BOX,
    0,
  );
