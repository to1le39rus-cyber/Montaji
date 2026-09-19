import { createStoreCommand,updateStoreCommand } from './stores.js';
export const createStoreService=({repository})=>({
 create:input=>repository.create(createStoreCommand(input)),
 update:(before,patch)=>repository.update(before.id,updateStoreCommand(before,patch)),
 remove:id=>repository.remove(id)
});
