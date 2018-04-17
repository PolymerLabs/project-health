export function newFakeRequest() {
  const fakeRequest = {
    body: {},
    params: {},
    query: {},
    // tslint:disable-next-line: no-any
  } as any;
  return Object.assign({}, fakeRequest);
}
