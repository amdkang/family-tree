class UniqueIDMap {
  constructor(map, usedIDs) {
    this.map = map;
    this.usedIDs = new Set(usedIDs);
    this.nextID = usedIDs.length+1;
  }

  getNextID() {
    let newID = this.nextID;  
    while (this.usedIDs.has(newID)) {  
      newID++;
    }    
    return newID; 
  }
 
  set(id, value) { 
    this.map.set(id, value); 
  }

  // Removes an entry by ID
  delete(id) {
    if (this.map.has(id)) {
      this.map.delete(id);
    }
  }

  // Get the value associated with an ID
  get(id) {
    return this.map.get(id);
  } 
};

class MemberMap extends UniqueIDMap {
  constructor(map, usedIDs) {
    super(map, usedIDs);
  }

  // Adds a new entry to the Map with a unique ID
  set(id, value) { 
    super.set(id, value);
    this.usedIDs.add(id); // mark ID as used
    this.nextID = id + 1;  
  }
  
  delete(id) {
    super.delete(id);
    this.usedIDs.delete(id); 
  }

}

class LevelMap extends UniqueIDMap {
  constructor(map, usedIDs) {
    super(map, usedIDs);
  }

  getNextMarriageID() {
    return super.getNextID();
  }

  // Adds a new entry to the Map with a unique ID
  setMarriage(levelID, marriageID, marriage) { 
    let level = this.get(levelID);
    level.marriages.set(marriageID, marriage);
    this.usedIDs.add(marriageID); // mark ID as used
    this.nextID = marriageID + 1;  
  } 
    
  deleteMarriage(levelID, marriageID) {
    let level = this.get(levelID);
    if (level.marriages.has(marriageID)) {
      level.marriages.delete(marriageID);
      this.usedIDs.delete(marriageID); 
    }
  }
 
}
 

export { LevelMap, MemberMap };