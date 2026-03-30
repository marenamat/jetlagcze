Add a save-function, so that one can store all the settings and reload it back later.
Also, keep the last setting inside the browser locally, and revive that on reload.

Add a reset button to get a clean state.

The settings should be a YAML so that it's editable outside.

Also, add a share-function, to create urls with a blob after hash, with the
same function as share-load. Keep that url blob as short as possible.

Add a special variant, instead of loading the settings from the browser, manually
or from the blob, allow pointing to a file in this github repository. There
should be a place where to put these files, some naming convention, and a link
variant with a pretty name of that file, so that I can create a permanent
"canonical view" for various purposes.
