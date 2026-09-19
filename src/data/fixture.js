export const loadFixture=async(url='./montaji-fixture.json')=>{
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw new Error('Fixture не загружен');
 const json=await response.json();
 return {
  shared:json?.data||{jobs:[],expenses:[],version:5},
  notes:Array.isArray(json?.notes)?json.notes:[]
 };
};
