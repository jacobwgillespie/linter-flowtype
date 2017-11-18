/* @flow */

import prettyPrintTypes from 'flow-language-server/lib/pkg/nuclide-flow-rpc/lib/prettyPrintTypes'

import {getFileMetadata, locationToRange} from '../helpers'
import {runFlow} from '../flow'

import type {TextEditor, Point} from 'atom'
import type {DatatipProvider, PackageConfig, TypeAtPosObject} from '../types'

export function toDatatip(editor: TextEditor, point: Point, result: string) {
  const parsed: TypeAtPosObject = JSON.parse(result)

  const {type, loc} = parsed
  if (type === '(unknown)') {
    return null
  }

  return {
    range: locationToRange(loc),
    markedStrings: [
      {
        type: 'snippet',
        grammar: editor.getGrammar(),
        value: prettyPrintTypes(type)
      }
    ]
  }
}

const datatip = (provider: DatatipProvider, config: PackageConfig) => async (
  editor: TextEditor,
  point: Point
): Promise<any> => {
  const fileMetadata = await getFileMetadata(editor, config, true)

  if (!fileMetadata) {
    return null
  }

  if (!fileMetadata.configFile) {
    return null
  }

  const flowOptions = [
    'type-at-pos',
    '--json',
    `--path=${fileMetadata.filePath}`,
    point.row + 1,
    point.column + 1
  ]

  try {
    const result = await runFlow({
      config: config,
      args: flowOptions,
      fileMetadata,
      options: {
        stdin: fileMetadata.fileText,
        uniqueKey: 'linter-flowtype-hyperclick'
      }
    })

    if (!result) {
      return null
    }

    return toDatatip(editor, point, result)
  } catch (error) {
    if ((error.isInitializing || error.isChecking) && provider.datatip) {
      return provider.datatip(editor, point)
    }
    throw error
  }
}

export default datatip
