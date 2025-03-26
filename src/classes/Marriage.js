import { SPOUSE_X_DISTANCE } from "../constants.js";

class Marriage {
    constructor({ marriageID, levelID, spouseXDist = SPOUSE_X_DISTANCE, children = [], between = [] } = {}) {
        this.marriageID = marriageID;
        this.levelID = levelID;
        this.between = between;
        this.children = children;
        this.spouseXDist = spouseXDist; 
    }  
};

export { Marriage };