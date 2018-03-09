export async function hasPushEnabled() {
  if ('permissions' in navigator) {
    // tslint:disable-next-line:no-any
    const permissionsAPI = (navigator as any)['permissions'];
    const result = await permissionsAPI.query({
      name: 'push',
      userVisibleOnly: true,
    });
    return result.state === 'granted';
  }

  return false;
}
