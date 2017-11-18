/* @flow */

import {shouldTriggerAutocomplete} from 'atom-autocomplete'
import path from 'path'
import score from 'sb-string_score'

import {getFileMetadata} from '../helpers'
import {runFlow} from '../flow'

import type {TextEditor} from 'atom'
import type {AutocompleteProvider, PackageConfig} from '../types'

const defaultFlowFile = path.resolve(__dirname, '..', 'vendor', '.flowconfig')

type AutocompleteParams = {
  activatedManually: any,
  bufferPosition: Object,
  editor: TextEditor,
  prefix: string
}

function injectPosition(text: string, editor: Object, bufferPosition: Object) {
  const characterIndex = editor.getBuffer().characterIndexForPosition(bufferPosition)
  return text.slice(0, characterIndex) + 'AUTO332' + text.slice(characterIndex)
}

function getType(value: {value: string, type: string}) {
  return value.type && value.type.substr(0, 1) === '{' ? 'Object' : value.type || 'any'
}

function toAutocompleteSuggestions(contents: string, prefix: string) {
  if (contents.slice(0, 1) !== '{') {
    // Invalid server response
    return []
  }

  const parsed = JSON.parse(contents)
  const hasPrefix = prefix.trim().length
  const suggestions = parsed.result.map(function(suggestion) {
    const isFunction = suggestion.func_details !== null
    let text = null
    let snippet = null
    let displayText = null
    let description = null

    if (isFunction) {
      const functionParams = suggestion.func_details.params
      displayText = `${suggestion.name}(${functionParams.map(value => value.name).join(', ')})`
      snippet = `${suggestion.name}(${functionParams
        .map(function(value, i) {
          return `\${${i + 1}:${value.name}}`
        })
        .join(', ')})$${functionParams.length + 1}`

      const params = functionParams.map(param => param.name + (param.type ? `: ${param.type}` : ''))
      const match = suggestion.type.match(/\(.*?\) => (.*)/)
      const returnType = match ? `=> ${match[1]}` : ''

      description = `(${params.join(', ')}) ${returnType}`
    } else {
      text = suggestion.name
    }

    return {
      text,
      type: isFunction ? 'function' : 'property',
      score: hasPrefix ? score(suggestion.name, prefix) : 1,
      snippet,
      leftLabel: isFunction ? 'function' : getType(suggestion),
      displayText,
      replacementPrefix: prefix,
      description
    }
  })
  return suggestions
    .sort(function(a, b) {
      return b.score - a.score
    })
    .filter(item => item.score)
}

const autocomplete = (provider: AutocompleteProvider, config: PackageConfig) => async (
  params: AutocompleteParams
) => {
  const {editor, bufferPosition, activatedManually} = params
  let prefix = params.prefix

  const fileMetadata = await getFileMetadata(editor, config, true)

  if (!fileMetadata) {
    return []
  }

  const fileContents = injectPosition(fileMetadata.fileText, editor, bufferPosition)

  if (!fileMetadata.configFile && config.onlyLintIfConfigExists) {
    return []
  }

  // NOTE: Fix for class properties autocompletion
  if (prefix === '.') {
    prefix = ''
  }

  if (!shouldTriggerAutocomplete({activatedManually, bufferPosition, editor})) {
    return []
  }

  try {
    const result = await runFlow({
      config: config,
      args: fileMetadata.configFile
        ? ['autocomplete', '--json', fileMetadata.filePath]
        : ['autocomplete', '--root', defaultFlowFile, '--json', fileMetadata.filePath],
      fileMetadata,
      options: {
        stdin: fileContents,
        uniqueKey: 'linter-flowtype-autocomplete'
      }
    })

    if (result === null || result === undefined) {
      return []
    }

    return toAutocompleteSuggestions(result, prefix)
  } catch (error) {
    if ((error.isInitializing || error.isChecking) && provider.getSuggestions) {
      return provider.getSuggestions(params)
    }
    throw error
  }
}

export default autocomplete
