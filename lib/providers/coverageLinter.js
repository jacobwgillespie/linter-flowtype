/* @flow */

import {getFileMetadata, toLinterLocation} from '../helpers'
import {runFlow} from '../flow'

import type {TextEditor} from 'atom'
import type {CoverageObject, LinterProvider, PackageConfig} from '../types'

function toCoverageLinterMessages(coverage: CoverageObject, filePath: string) {
  return coverage.expressions.uncovered_locs.map(loc => ({
    severity: 'info',
    location: toLinterLocation(loc, filePath),
    excerpt: 'Uncovered code'
  }))
}

const coverageLinter = (
  linter: LinterProvider,
  config: PackageConfig,
  coverageView: any,
  coverages: any
) => async (textEditor: TextEditor) => {
  const fileMetadata = await getFileMetadata(textEditor, config, false)

  // If the file has no file path, exit
  if (!fileMetadata) {
    return []
  }

  // If no flow config file exists, exit
  if (config.onlyLintIfConfigExists && !fileMetadata.configFile) {
    return []
  }

  // If the file doesn't have the @flow pragma, exit
  if (!fileMetadata.fileText.match(/@flow/)) {
    return []
  }

  try {
    const result = await runFlow({
      config: config,
      args: textEditor.isModified()
        ? ['coverage', '--json']
        : ['coverage', fileMetadata.filePath, '--json'],
      fileMetadata,
      options: {
        ...(textEditor.isModified() ? {stdin: fileMetadata.fileText} : {}),
        uniqueKey: 'linter-flowtype-coverage'
      }
    })

    if (!result) {
      return null
    }

    const coverage: CoverageObject = JSON.parse(result)
    coverages.set(textEditor, coverage)
    if (coverageView) {
      coverageView.update(coverage)
    }
    return config.showUncovered ? toCoverageLinterMessages(coverage, fileMetadata.filePath) : []
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

export default coverageLinter
