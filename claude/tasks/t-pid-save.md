Add a save-function, so that one can store all the settings and reload it back later.
Also, keep the last setting inside the browser locally, and revive that on reload.

Add a reset button to get a clean state.

The settings should be a YAML so that it's editable outside.

Also, add a share-function, to create urls with a blob after hash, with the
same function as share-load. Keep that url blob as short as possible.
