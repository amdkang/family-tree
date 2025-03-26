import { SIBLING_X_DISTANCE } from "../constants.js";

class Level {
    constructor({ levelID, siblingXDist = SIBLING_X_DISTANCE, marriages = new Map() } = {}) {
      this.levelID = levelID;
      this.siblingXDist = siblingXDist;
      this.marriages = marriages;
    }  
};

export { Level };