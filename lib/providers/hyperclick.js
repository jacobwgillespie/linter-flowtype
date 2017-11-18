/* @flow */

import type {TextEditor, Range} from 'atom'

import {getFileMetadata} from '../helpers'
import {runFlow} from '../flow'

import type {PackageConfig} from '../types'

const hyperclick = (provider: HyperclickProvider, config: PackageConfig) => async (
  textEditor: TextEditor,
  text: string,
  range: Range
): Promise<?HyperclickSuggestion> => {
  const fileMetadata = await getFileMetadata(textEditor, config, true)

  if (!fileMetadata) {
    return null
  }

  if (!fileMetadata.configFile) {
    return null
  }

  const flowOptions = [
    'get-def',
    '--json',
    '--path=' + fileMetadata.filePath,
    range.start.row + 1,
    range.start.column + 1
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

    const jsonResult = JSON.parse(result)

    if (!jsonResult.path) {
      return null
    }

    return {
      range,
      callback() {
        atom.workspace.open(jsonResult.path, {searchAllPanes: true}).then(editor => {
          editor.setCursorBufferPosition([jsonResult.line - 1, jsonResult.start - 1])
        })
      }
    }
  } catch (error) {
    if ((error.isInitializing || error.isChecking) && provider.getSuggestionForWord) {
      return provider.getSuggestionForWord(textEditor, text, range)
    }
    throw error
  }
}

export default hyperclick
