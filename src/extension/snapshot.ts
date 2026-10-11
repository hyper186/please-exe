/** Never display a result against a draft that changed, even without an input event. */
export async function checkSnapshot<T>(snapshot: string, read: () => string, request: () => Promise<T>): Promise<T> {
  const ensureCurrent = () => { if (read() !== snapshot) throw new Error('The draft changed. Review it again.'); };
  ensureCurrent();
  const result = await request();
  ensureCurrent();
  return result;
}
