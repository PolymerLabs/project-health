let orgListContainer: Element;

type OrgWebHookState = {
  name: string;
  canAdminister: boolean;
  hookIsEnabled: boolean;
};

type AllOrgsState = {
  orgs: OrgWebHookState[];
};

async function getState() {
  const state: AllOrgsState = {
    orgs: [],
  };

  // TODO: Get All Orgs
  const res = await fetch('/api/settings/orgs.json', {
    credentials: 'include',
    method: 'POST',
  });
  const response = await res.json();
  console.log(response);

  return state;
}

async function updateUI() {
  const state = await getState();
  console.log('State: ', state);
  for(const org of state.orgs) {
    console.log('Must configure org: ', org);
  }
}

function start() {
  const listElement = document.querySelector('.org-webhook-list');

  if (!listElement) {
    throw new Error('Unable to find toggle element.');
  }

  orgListContainer = listElement;

  updateUI();
}

start();
