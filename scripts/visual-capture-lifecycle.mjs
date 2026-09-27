function recordCleanupError(onCleanupError, resourceName, error) {
  onCleanupError(`${resourceName} cleanup failed: ${String(error)}`);
}

async function closeResource(resource, resourceName, onCleanupError) {
  if (!resource) {
    return;
  }

  try {
    await resource.close();
  } catch (error) {
    recordCleanupError(onCleanupError, resourceName, error);
  }
}

export async function closeCaptureResources({
  page,
  context,
  browser,
  onCleanupError,
}) {
  await closeResource(page, 'page', onCleanupError);
  await closeResource(context, 'context', onCleanupError);
  await closeResource(browser, 'browser', onCleanupError);
}

/** Persist a fresh capture attempt before work, then retain failures and cleanup. */
export async function runCaptureAttempt({
  manifest,
  writeManifest,
  run,
  cleanup,
}) {
  await writeManifest();

  try {
    await run();
  } catch (error) {
    manifest.errors.push(String(error));
    manifest.status = 'failed';
  } finally {
    await cleanup();
    if (manifest.errors.length) {
      manifest.status = 'failed';
    }
    await writeManifest();
  }

  return manifest;
}
