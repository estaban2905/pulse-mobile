import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FRETS_SHOWN, type ChordShape } from '@pulse/core';
import { colors, radii, typography } from '../../theme';

interface ChordDiagramProps {
  shape: ChordShape;
  /** Separación entre cuerdas. Todo el diagrama se escala a partir de aquí. */
  gap?: number;
}

const STRINGS = 6;
const LINE = StyleSheet.hairlineWidth;

/**
 * El diagrama de una postura de guitarra.
 *
 * Dibujado con vistas y no con SVG porque el proyecto no lleva `react-native-svg`
 * y un mástil son seis rayas, cinco rayas y unos puntos: no compensa arrastrar
 * una dependencia nativa —con su recompilación del binario— por eso.
 *
 * Se lee como se mira una guitarra de frente: las cuerdas en vertical, la más
 * grave a la izquierda, y la cejuela arriba.
 */
export function ChordDiagram({ shape, gap = 16 }: ChordDiagramProps) {
  const width = gap * (STRINGS - 1);
  const fretHeight = gap * 1.25;
  const height = fretHeight * FRETS_SHOWN;
  const dot = gap * 0.72;

  /** Fila del diagrama en la que cae un traste, ya descontado el desplazamiento. */
  const rowOf = (fret: number) => (fret - shape.baseFret) * fretHeight + fretHeight / 2;

  return (
    <View style={styles.wrapper}>
      {/* Cuerdas al aire y mudas, encima de la cejuela. */}
      <View style={[styles.markers, { width, height: gap }]}>
        {shape.frets.map((fret, string) => (
          <Text
            key={string}
            style={[styles.marker, { left: string * gap - gap / 2, width: gap }, fret < 0 && styles.markerMuted]}
          >
            {fret < 0 ? '×' : fret === 0 ? '○' : ''}
          </Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row' }}>
        {/* El traste por el que empieza el diagrama, cuando no es el primero. */}
        <View style={[styles.baseFret, { height, width: gap * 1.4 }]}>
          {shape.baseFret > 1 ? <Text style={styles.baseFretLabel}>{shape.baseFret}</Text> : null}
        </View>

        <View style={{ width, height }}>
          {/* La cejuela es gruesa; a partir del segundo traste ya no se ve. */}
          <View
            style={[
              styles.fret,
              { width },
              shape.baseFret === 1 && { height: 3, backgroundColor: colors.textMuted, borderRadius: 2 }
            ]}
          />
          {Array.from({ length: FRETS_SHOWN }, (_, row) => (
            <View key={row} style={[styles.fret, { width, top: (row + 1) * fretHeight }]} />
          ))}

          {Array.from({ length: STRINGS }, (_, string) => (
            <View key={string} style={[styles.string, { height, left: string * gap }]} />
          ))}

          {shape.barre ? (
            <View
              style={[
                styles.barre,
                {
                  left: shape.barre.from * gap - dot / 2,
                  width: (shape.barre.to - shape.barre.from) * gap + dot,
                  height: dot,
                  borderRadius: dot / 2,
                  top: rowOf(shape.barre.fret) - dot / 2
                }
              ]}
            />
          ) : null}

          {shape.frets.map((fret, string) => {
            // Los dedos que sólo repiten la cejilla no se dibujan: ensucian el
            // diagrama y el dedo que los pisa ya está representado por la barra.
            if (fret <= 0 || (shape.barre && fret === shape.barre.fret)) return null;

            return (
              <View
                key={string}
                style={[
                  styles.dot,
                  {
                    width: dot,
                    height: dot,
                    borderRadius: dot / 2,
                    left: string * gap - dot / 2,
                    top: rowOf(fret) - dot / 2
                  }
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  markers: { position: 'relative' },
  marker: {
    position: 'absolute',
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16
  },
  markerMuted: { color: colors.textDim },
  baseFret: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  baseFretLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
  fret: { position: 'absolute', left: 0, top: 0, height: LINE, backgroundColor: colors.border },
  string: { position: 'absolute', top: 0, width: LINE, backgroundColor: colors.border },
  barre: { position: 'absolute', backgroundColor: colors.accent },
  dot: { position: 'absolute', backgroundColor: colors.accent, borderRadius: radii.round }
});
