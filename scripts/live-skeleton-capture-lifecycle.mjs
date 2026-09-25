async function closeResource(resource, name, onCleanupError) {
  if (!resource) return;
  try {
    await resource.close();
  } catch (error) {
    onCleanupError(`${name} cleanup failed: ${String(error)}`);
  }
}

/** Allocate a browser/page stack and close every allocated resource. */
export async function withBrowserPage({
  launchBrowser,
  createContext,
  createPage,
  run,
  onCleanupError,
}) {
  let browser;
  let context;
  let page;
  try {
    browser = await launchBrowser();
    context = await createContext(browser);
    page = await createPage(context);
    await run(page);
  } finally {
    await closeResource(page, 'page', onCleanupError);
    await closeResource(context, 'context', onCleanupError);
    await closeResource(browser, 'browser', onCleanupError);
  }
}
