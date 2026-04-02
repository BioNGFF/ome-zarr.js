
import { Axis } from './types/ome';

export type LayerType = 'auto' | 'image' | 'segmentation';

/**
 * Get the Neuroglancer source for a given Zarr array.
 */
function getNeuroglancerSource(dataUrl: string, zarrVersion: 2 | 3): string {
  // Neuroglancer expects a trailing slash
  const normalizedDataUrl = dataUrl + (dataUrl.endsWith('/') ? '' : '/');
  return normalizedDataUrl + '|zarr' + zarrVersion + ':';
}

/**
 * Get the layer name for a given URL, the same way that Neuroglancer does it.
 */
function getLayerName(dataUrl: string): string {
  // Get the last component of the URL after the final slash (filter(Boolean) discards empty strings)
  return dataUrl.split('/').filter(Boolean).pop() || 'Default';
}

/**
 * Generate a simple Neuroglancer state for a given Zarr array.
 * 
 * Code adapted from Fileglancer at
 * https://github.com/JaneliaSciComp/fileglancer/blob/376ef9a1d09064772b46c5ca9722a29c0f6b7b65/frontend/src/omezarr-helper.ts#L244
 */
function generateNeuroglancerStateForOmeZarr(
  dataUrl: string,
  zarrVersion: 2 | 3,
  layerType: LayerType,
  axes: Axis[],
  shape: number[]
): string {

  const axesMap: Record<string, any> = {};
  axes.forEach((axis, i) => {
    axesMap[axis.name] = { ...axis, index: i };
  });

  // Determine the layout based on the z-axis
  let layout = '4panel-alt';
  if ('z' in axesMap) {
    const zAxisIndex = axesMap['z'].index;
    const zDimension = shape[zAxisIndex];
    if (zDimension === 1) {
      layout = 'xy';
    }
  } else {
    // No z-axis, use xy layout
    layout = 'xy';
  }

  // Consider this a segmentation if the layer type is segmentation
  // AND there is no channel axis or the channel axis has only one channel
  const type =
    layerType === 'segmentation' &&
    (!axesMap['c'] || shape[axesMap['c']?.index] === 1)
      ? 'segmentation'
      : 'auto';

  const state = {
    layers: [
      {
        name: getLayerName(dataUrl),
        source: getNeuroglancerSource(dataUrl, zarrVersion),
        type
      }
    ],
    layout: layout
  };

  // Convert the state to a URL-friendly format
  const stateJson = JSON.stringify(state);
  return encodeURIComponent(stateJson);
}


export {
  generateNeuroglancerStateForOmeZarr,
};
