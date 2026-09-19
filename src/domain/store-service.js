import { createStoreCommand,updateStoreCommand } from './stores.js';
export const createStoreService=({repository})=>({
 create:input=>repository.create(createStoreCommand(input)),
 update:(id,patch)=>repository.update(id,current=>updateStoreCommand(current,patch)),
 remove:id=>repository.remove(id)
});
