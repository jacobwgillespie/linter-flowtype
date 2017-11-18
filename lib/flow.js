/* @flow */

import path from 'path'
import {exec, findCached, findCachedAsync} from 'atom-linter'

import type {FileMetadata, PackageConfig} from './types'

const INIT_MESSAGE = 'flow server'
const RECHECKING_MESSAGE = 'flow is'

const spawnedServers: Set<string> = new Set()
const defaultFlowBinLocation = 'node_modules/.bin/flow'

async function getExecutablePath(config: PackageConfig, fileDirectory: string): Promise<string> {
  if (config.executablePath) {
    return config.executablePath
  }

  if (config.useLocalFlowBin) {
    return (await findCachedAsync(fileDirectory, defaultFlowBinLocation)) || 'flow'
  }

  return 'flow'
}

type RunFlowParams = {
  args: Array<string>,
  config: PackageConfig,
  fileMetadata: FileMetadata,
  options: Object
}

export async function runFlow({
  args,
  config,
  fileMetadata,
  options
}: RunFlowParams): Promise<?string> {
  if (!fileMetadata.filePath) return null

  try {
    return await exec(await getExecutablePath(config, fileMetadata.fileDirectory), args, {
      cwd: fileMetadata.fileDirectory,
      timeout: 60 * 1000,
      ignoreExitCode: true,
      ...options
    })
  } catch (error) {
    error.isInitializing = error.message.indexOf(INIT_MESSAGE) !== -1
    error.isChecking = error.message.indexOf(RECHECKING_MESSAGE) !== -1

    if (
      error.message.indexOf(INIT_MESSAGE) !== -1 &&
      fileMetadata.configFile !== null &&
      fileMetadata.configFile !== undefined
    ) {
      spawnedServers.add(path.dirname(fileMetadata.configFile))
    }

    throw error
  }
}

export function shutdownSpawnedServers(executablePath: string) {
  spawnedServers.forEach(rootDirectory => {
    const executable = executablePath || findCached(rootDirectory, defaultFlowBinLocation) || 'flow'
    exec(executable, ['stop'], {
      cwd: rootDirectory,
      timeout: 60 * 1000,
      detached: true,
      ignoreExitCode: true
    }).catch(() => null) // ignore all errors
  })
}
