/* @flow */

import {getFileMetadata, locationToRange, toLinterLocation} from '../helpers'
import {prettyPrintError, mainMessageOfError} from '../helpers-linter'
import {runFlow} from '../flow'

import type {TextEditor} from 'atom'
import type {LinterProvider, PackageConfig, StatusObject} from '../types'

function toLinterReference(messages) {
  for (let i = 1, length = messages.length; i < length; i++) {
    const message = messages[i]
    if (message.loc) {
      return {
        file: message.loc.source,
        position: locationToRange(message.loc).start
      }
    }
  }
  return null
}

function toStatusLinterMessages(contents: string) {
  const parsed: StatusObject = JSON.parse(contents)
  if (!Array.isArray(parsed.errors) || !parsed.errors.length) {
    return []
  }

  return parsed.errors.map(error => {
    const mainMsg = mainMessageOfError(error)
    let excerpt = error.message.map(msg => msg.descr).join(' ')
    if (error.operation && mainMsg === error.operation) {
      excerpt = error.operation.descr + ' ' + excerpt
    }

    return {
      severity: error.level === 'error' ? 'error' : 'warning',
      location: mainMsg.loc && toLinterLocation(mainMsg.loc),
      excerpt,
      description: prettyPrintError(error),
      reference: toLinterReference(error.message)
    }
  })
}

const statusLinter = (linter: LinterProvider, config: PackageConfig) => async (
  textEditor: TextEditor
) => {
  const fileMetadata = await getFileMetadata(textEditor, config, false)

  // If the file has no file path, exit
  if (!fileMetadata) {
    return []
  }

  // If no flow config file exists, exit
  if (config.onlyLintIfConfigExists && !fileMetadata.configFile) {
    return []
  }

  try {
    const result = await runFlow({
      config,
      args: textEditor.isModified()
        ? ['check-contents', '--json', '--root', fileMetadata.fileDirectory, fileMetadata.filePath]
        : ['status', '--json', fileMetadata.filePath],
      fileMetadata,
      options: {
        ...(textEditor.isModified() ? {stdin: fileMetadata.fileText} : {}),
        uniqueKey: 'linter-flowtype-linter'
      }
    })

    if (!result) {
      return null
    }

    return toStatusLinterMessages(result)
  } catch (error) {
    if ((error.isInitializing || error.isChecking) && linter.lint) {
      return linter.lint(textEditor)
    } else if (error.code === 'ENOENT') {
      throw new Error('Unable to find `flow` executable.')
    } else {
      throw error
    }
  }
}

export default statusLinter
