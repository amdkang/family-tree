import { Level } from "./classes/Level.js";
import { Marriage } from "./classes/Marriage.js";
import { Member } from "./classes/Member.js";
import { PARENT_CHILD_Y_DISTANCE, SIBLING_X_DISTANCE, SPOUSE_X_DISTANCE } from "./constants.js"; 


 

// create/adds parent member to existing child member  
export function addParent(newParent, childID, members, levels) {  
    let child = members.get(childID); 
    if (child.level === -3) throw new Error("Cannot add members beyond this level");
    if (child.isAddOnSpouse) throw new Error("Cannot add parents to this member");
 
    // make parent level if non-existent
    addDefaultParent(child, levels);  


    let parentMarr = getMarriage(levels, child.parentMarriage);  
    let isAddOnSpouse = child.level-1 >= 0 && firstSpouseIsMain(parentMarr, members); 
    let parent = new Member({ 
        memberID: members.getNextID(), 
        level: child.level-1, 
        marriage: parentMarr.marriageID,
        isAddOnSpouse: isAddOnSpouse, 
        ...newParent 
    });
    parentMarr.between.push(parent.memberID);

    // auto-create grandparent marriage/level if non-existent 
    if (parent.level > -3) addDefaultParent(parent, levels);   
    members.set(parent.memberID, parent); 
}; 

function addDefaultParent(child, levels) {   
    let parentLvl = levels.get(child.level-1);    
    if (!parentLvl) {  
        parentLvl = new Level({ levelID: child.level-1 });  
        levels.set(parentLvl.levelID, parentLvl);  
    }     
    let parentMarr = getMarriage(levels, child.parentMarriage);  
    if (!parentMarr) {  
        parentMarr = new Marriage({ marriageID: levels.getNextMarriageID(), levelID: parentLvl.levelID });  
        child.parentMarriage = parentMarr.marriageID; 
        levels.setMarriage(parentLvl.levelID, parentMarr.marriageID, parentMarr); 
    }  
    if (!parentMarr.children.includes(child.memberID)) { 
        parentMarr.children.push(child.memberID);   
    } 
};

// create/adds child member to existing parent member 
export function addChild(newChild, parentID, members, levels) { 
    let parent = members.get(parentID);   
    if (parent.level === -3 || parent.level === 3) {
        throw new Error("Cannot add children to this member");
    }

    // make child level if non-existent 
    let childLvl = levels.get(parent.level+1);  
    if (!childLvl) {  
        childLvl = new Level({ levelID: parent.level+1 });   
        levels.set(childLvl.levelID, childLvl);  
    } 

    // // make parent marriage if non-existent 
    let parentMarr = getMarriage(levels, parent.marriage); 
    if (!parentMarr) {   
        let parentLvl = levels.get(parent.level); 
        parentMarr = new Marriage({ marriageID: levels.getNextMarriageID(), levelID: parent.level, between: [parentID] });  
        parent.marriage = parentMarr.marriageID;
        levels.setMarriage(parentLvl.levelID, parentMarr.marriageID, parentMarr); 
    }  
    let child = new Member({ 
        memberID: members.getNextID(), 
        level: childLvl.levelID, 
        parentMarriage: parent.marriage,  
        ...newChild 
    });
    members.set(child.memberID, child);  
    parentMarr.children.push(child.memberID);
};

// create/adds sibling to existing member  
export function addSibling(newSiblingData, oldSiblingID, members, levels) {
    let oldSibling = members.get(oldSiblingID);
    if (oldSibling.level <= -2 || oldSibling.isAddOnSpouse) { 
        throw new Error("Cannot add siblings to this member");
    }  

    let parentMarr = getMarriage(levels, oldSibling.parentMarriage);   
    if (parentMarr.children.length === 5) {
        throw new Error("Limit of 5 children per marriage")
    }

    let newSibling = new Member({ 
        memberID: members.getNextID(), 
        level: oldSibling.level,
        parentMarriage: parentMarr.marriageID,
        ...newSiblingData 
    }); 
    members.set(newSibling.memberID, newSibling);   
    parentMarr.children.push(newSibling.memberID);
};

// create/adds spouse to existing member 
export function addSpouse(newSpouseData, oldSpouseID, members, levels) { 
    let oldSpouse = members.get(oldSpouseID);
    let marriage = getMarriage(levels, oldSpouse.marriage);   
    if (oldSpouse.isAddOnSpouse || marriage?.between.length === 2) {  
        throw new Error("Cannot add spouse to this member");
    };
    let spouseLvl = levels.get(oldSpouse.level);

    // make/set spouse marriage if non-existent 
    if (!marriage) {
        marriage = new Marriage({ marriageID: levels.getNextMarriageID(), levelID: oldSpouse.level, between: [oldSpouseID] }); 
        oldSpouse.marriage = marriage.marriageID;    
        levels.setMarriage(spouseLvl.levelID, marriage.marriageID, marriage); 
    }

    let newSpouse = new Member({ 
        memberID: members.getNextID(), 
        level: oldSpouse.level,
        marriage: oldSpouse.marriage,
        ...newSpouseData 
    }); 

    if (!isMainParent(oldSpouseID, members, levels)) {
        newSpouse.isAddOnSpouse = true;
    } else { // auto-create parent marriage/level if newly added spouse is a `main parent`  
        addDefaultParent(newSpouse, levels); 
    } 

    marriage.between.push(newSpouse.memberID);
    members.set(newSpouse.memberID, newSpouse);    
};


export function positionMembers(members, levels) {   
    const user = members.get(1); 
    const userLvl = levels.get(0);
    
    const parentMarriage = getMarriage(levels, user.parentMarriage); 
    const grandparentsFull = parentMarriage && areSpouseParentsFull(parentMarriage, members, levels); 
    

    // CHECK THIS -> more accurate/uniform way to adjust parents spouse distance? 
    // in levels 0 to -2 (main user ~ grandparents), each member can have 1 spouse & 2 parents 
    // adjust /spouse distance to ensure no overlap between members
    adjustSpouseXDist(-1, (grandparentsFull ? 4 : 2) * SPOUSE_X_DISTANCE, members, levels);
    adjustSpouseXDist(-2, 2 * SPOUSE_X_DISTANCE, members, levels);
    adjustSpouseXDist(-3, SPOUSE_X_DISTANCE/2, members, levels);  
    members.map.forEach((value) => { 
        let member = value;
        member.x = 0;
        member.y = 0;
    }); 
 
    orderMainUserSiblings(user, parentMarriage, members, levels); 
    positionChildren(parentMarriage, userLvl, members, levels); // positions main user/siblings/children & lower levels

    // positions main user's parents & upper levels
    if (parentMarriage && parentMarriage.between.length > 0) { 
        const userParentLvl = levels.get(-1);  
        positionParents(parentMarriage, userParentLvl, members, levels); 
    } 
};


function orderMainUserSiblings(user, parentMarriage, members, levels) {
    if (parentMarriage.children.length > 1) { 
        let userMarriage = getMarriage(levels, user.marriage);
        if (userMarriage) { 
            //position spouses at far-most end amongst their siblings
            for (let i = 0; i < userMarriage.between.length; i++) {
                let spouse = members.get(userMarriage.between[i]);
                let spouseParentMarr = getMarriage(levels, spouse.parentMarriage);
                if (spouseParentMarr) {
                    let spouseIndex = getElementIndex(spouse.memberID, spouseParentMarr.children);
                
                    // left parent = positioned last/right-most amongst siblings
                    // right parent = positioned first/left-most amongst siblings
                    let switchIndex = i === 0 ? spouseParentMarr.children.length-1 : 0;
                    let switchSiblingID = spouseParentMarr.children[switchIndex];
                    spouseParentMarr.children[switchIndex] = spouse.memberID;
                    spouseParentMarr.children[spouseIndex] = switchSiblingID;
                }
            }
        } 
    }
}

// positions children in given marriage based on number/position of parents
function positionChildren(marriage, level, members, levels) {  
    const midChildIndex = getMidChildIndex(marriage); 
    const midChild = members.get(marriage.children[midChildIndex]);
    let midpointX= 0;  
 
    // position middle child
    if (midChild.memberID !== 1) { // main user always at (0,0)
        const parent1 = members.get(marriage.between[0]);
        if (parent1) {
            //1 parent -> use single parent as midpoint
            midpointX = parent1.x; 

            //2 parents -> use midpoint between parents
            if (marriage.between.length === 2) { 
                let parent2 = members.get(marriage.between[1]);
                midpointX = (parent1.x + parent2.x) / 2;
            };

            // odd # children -> keep same midpoint from above
            // even # children -> use midpoint between middle two children
            if (marriage.children.length % 2 === 0) {
                midpointX -= level.siblingXDist / 2;
            } 
            midChild.x = midpointX;
            midChild.y = parent1.y + PARENT_CHILD_Y_DISTANCE; 
        }
    }
    // if (marriage.children.length > 1) {
        positionChildSiblings(midChildIndex, marriage, level, members, levels);
    // }
};

// positions siblings around middle child in given marriage
// function positionChildSiblings(midChildIndex, marriage, level, members, levels) {   
//     let midChild = members.get(marriage.children[midChildIndex]);

//     for (let i = 0; i < marriage.children.length; i++) { 
//         // if (i !== midChildIndex) {
//             // calculate each sibling's distance from middle child
//             let xOffset = Math.abs(midChildIndex - i) * level.siblingXDist;  
//             if (i < midChildIndex) xOffset *= -1;  

//             // set coordinates for siblings & their spouses/children
//             let sibling = members.get(marriage.children[i]);    
//             if (sibling.memberID !== midChild.memberID) {
//                 sibling.x =  midChild.x + xOffset;
//                 sibling.y = midChild.y;
//             }

//             let siblingMarr = getMarriage(levels, sibling.marriage);
//             if (siblingMarr) {
//                 const spouse = getSpouse(sibling.memberID, siblingMarr, members);
//                 if (spouse) {  
//                     spouse.x = sibling.x + siblingMarr.spouseXDist;
//                     spouse.y = sibling.y; 
//                 }    
//                 if (siblingMarr.children.length > 0) { 
//                     const siblingChildLvl = levels.get(siblingMarr.levelID + 1);
//                     if (siblingChildLvl) { 
//                         positionChildren(siblingMarr, siblingChildLvl, members, levels);
//                     }
//                 }
//             }
//         // }
//     }
// };
function positionChildSiblings(midChildIndex, marriage, level, members, levels) {   
    let midChild = members.get(marriage.children[midChildIndex]); 

    // stores bool values for whether previous sibling has spouse
    // used to increase distance between siblings with spouses
    let prevHasSpouse = []; 
    for (let i = 0; i < marriage.children.length; i++) {  
        let sibling = members.get(marriage.children[i]);     
        prevHasSpouse.push(sibling.marriage > 0); 

        // calculate each sibling's distance from middle child
        let xOffset = Math.abs(midChildIndex - i) * level.siblingXDist;  
        if (i < midChildIndex) {
            xOffset *= -1;
            if (sibling.marriage > 0) {
                xOffset -= SPOUSE_X_DISTANCE;
            }
        } else if (i > midChildIndex) {  
            if (prevHasSpouse[i-1]) {
                xOffset += SPOUSE_X_DISTANCE;
            }
        }
        
        // set coordinates for siblings & their spouses/children
        if (sibling.memberID !== midChild.memberID) {
            sibling.x =  midChild.x + xOffset;
            sibling.y = midChild.y;
        } 
        let siblingMarr = getMarriage(levels, sibling.marriage);
        if (siblingMarr) {
            const spouse = getSpouse(sibling.memberID, siblingMarr, members);
            if (spouse) {  
                spouse.x = sibling.x + siblingMarr.spouseXDist;
                spouse.y = sibling.y; 
            }    
            if (siblingMarr.children.length > 0) { 
                const siblingChildLvl = levels.get(siblingMarr.levelID + 1);
                if (siblingChildLvl) { 
                    positionChildren(siblingMarr, siblingChildLvl, members, levels);
                }
            }
        } 
    } 
};


// positions spouses for a given marriage
function positionParents(marriage, level, members, levels) {  
    // use middle child's coordinates to position parents
    const midChildIndex = getMidChildIndex(marriage);
    const midChildID = marriage.children[midChildIndex];
    const midChild = members.get(midChildID);
    const childLvl = levels.get(midChild.level);
    const midpointX = marriage.children.length % 2 === 0 
        ? midChild.x + childLvl.siblingXDist / 2 
        : midChild.x
    ; 

    // order parents amongst their siblings 
    if (marriage.between.length > 0) { 
        const parent1 = members.get(marriage.between[0]);
        if (parent1) {
            parent1.x = midpointX;
            parent1.y = midChild.y - PARENT_CHILD_Y_DISTANCE; 
            
            orderMainUserSiblings(parent1, marriage, members, levels);
            if (marriage.between.length === 2) {
                // 2 parents -> position left & right parent at the far end amongst their siblings
                const parent2 = members.get(marriage.between[1]);
                parent1.x -= marriage.spouseXDist/2;
                parent2.x = midpointX + marriage.spouseXDist/2;
                parent2.y = parent1.y;  
                if (getMarriage(levels, parent2.marriage)) {
                    orderMainUserSiblings(parent2, getMarriage(levels, parent2.marriage), members, levels);  
                }   
            }
        };

        // position each parent's siblings/parents
        marriage.between.forEach(parentID => {
            let parent = members.get(parentID);
            let gparentMarriage = getMarriage(levels, parent.parentMarriage);  
            if (gparentMarriage) {
                if (gparentMarriage.children.length > 1) {
                    positionParentSiblings(parent, gparentMarriage, level, members, levels);
                }
                positionParents(gparentMarriage, level, members, levels);
            } 
        });
    }
};

function calcXOffset(marriage, xDist, levels, members, startChildIndex, endChildIndex) {
    let numKids = 0;
    let totalSpouseXDist = 0;

    for (let i = startChildIndex; i <= endChildIndex; i++) {
        let child = members.get(marriage.children[i]); 
        numKids++;
        let childMarr = getMarriage(levels, child.marriage);
        if (childMarr) {
            totalSpouseXDist += childMarr.spouseXDist;
        }
    }
    return (Math.max((numKids-1), 0) * xDist) + totalSpouseXDist;
};
 
// positions main user's parents amongst their siblings  
function positionParentSiblings(parent, gparentMarr, level, members, levels) {  
    let parentIndex = getElementIndex(parent.memberID, gparentMarr.children);
    let lvlBelow = levels.get(parent.level-1);

    if (parentIndex > 0) {
        for (let i = parentIndex - 1; i >= 0; i--) {
            const currentMember = members.get(gparentMarr.children[i]);
            const currentMarr = getMarriage(levels, currentMember.marriage);
            let currentKids = currentMarr?.children.length ?? 0;

            let rightSibling = members.get(gparentMarr.children[i+1]);
            let farRightX = rightSibling.x; // farRightX = starting point for current member
            if (currentKids > 0) {
                let rightSiblingKids = getMarriage(levels, rightSibling.marriage)?.children;
                if (rightSiblingKids && rightSiblingKids.length > 1) { 
                    farRightX = members.get(rightSiblingKids[0]).x;
                } 
            }
            
            // factor in current member' kids
            let xOffset = currentKids > 0 ? calcXOffset(currentMarr, lvlBelow.siblingXDist, levels, members, getMidChildIndex(currentMarr), currentKids-1)
                : 0;

            // set coordinates for unpositioned sibling 
            currentMember.x = farRightX - level.siblingXDist - xOffset;
            currentMember.y = parent.y;  

            // position sibling & their spouse/children
            positionSiblingFamily(currentMember, level, members, levels); 
        }
    } else if (parentIndex === 0) { 
        for (let i = 1; i < gparentMarr.children.length; i++) {
            const currentMember = members.get(gparentMarr.children[i]);
            const currentMarr = getMarriage(levels, currentMember.marriage);
            let currentKids = currentMarr?.children.length ?? 0;

            let leftSibling = members.get(gparentMarr.children[i-1]);
            let farLeftX = leftSibling.x;   

            if (currentKids > 0) {
                let leftSiblingKids = getMarriage(levels, leftSibling.marriage)?.children;
                if (leftSiblingKids && leftSiblingKids.length > 1) { 
                    farLeftX = members.get(leftSiblingKids[leftSiblingKids.length-1]).x;
                } 
            }

            let xOffset = currentKids > 0 ? calcXOffset(currentMarr, lvlBelow.siblingXDist, levels, members, 0,  getMidChildIndex(currentMarr))
                : 0; 

            // let xOffset = Math.max(((currentKids/2)-0.5), 0) * lvlBelow.siblingXDist; 

            currentMember.x = farLeftX + level.siblingXDist + xOffset;
            currentMember.y = parent.y;  
 
            positionSiblingFamily(currentMember, level, members, levels); 
        }
    } 
};
function positionSiblingFamily(parentSibling, level, members, levels) {
    const siblingMarr = getMarriage(levels, parentSibling.marriage);
    if (siblingMarr) {  
        const spouse = getSpouse(parentSibling.memberID, siblingMarr, members);
        if (spouse && spouse.isAddOnSpouse) {  
            spouse.x = parentSibling.x + siblingMarr.spouseXDist;
            spouse.y = parentSibling.y; 
        } 
        if (siblingMarr.children.length > 0) { 
            let childLvl = levels.get(level.levelID-1);
            positionChildren(siblingMarr, childLvl, members, levels); 
        }
    }
}; 
 

function getMidChildIndex(marriage) {
    const childCount = marriage.children.length; 
    let midChildIndex = Math.floor(childCount/2);
    if (childCount % 2 === 0) midChildIndex -= 1;
    return midChildIndex;
};

function getElementIndex(elementID, elements) {
    for (let i = 0; i < elements.length; i++) {
        if (elements[i] === elementID) return i;
    }
    return -1;
};

function getMarriage(levels, marriageID) {  
    for (let lvl of levels.map.values()) {  
        let marriage = lvl.marriages.get(marriageID); 
        if (marriage !== undefined) return marriage;
    };
    return null;
};

// given memberID, returns that member's spouse, otherwise returns null
function getSpouse(memberID, marriage, members) { 
    if (marriage.between.length !== 2) return null; 

    if (marriage.between[0] === memberID) {
        return members.get(marriage.between[1]);  
    } else if (marriage.between[1] === memberID) {
        return members.get(marriage.between[0]);
    }
    return null; 
};

// returns true if member is `main parent` (main user's direct parent or grandparent)
function isMainParent(memberID, members, levels) {
    const user = members.get(1);
    const parentMarr = getMarriage(levels, user.parentMarriage);
    for (const parentID of parentMarr.between) {
        if (parentID === memberID) return true;
        let parent = members.get(parentID);
        let gparentMarr = getMarriage(levels, parent.parentMarriage);
        if (gparentMarr) {
            for (const gparentID of gparentMarr.between) {
                if (gparentID === memberID) return true;
            }
        }
    };
    return false;
};

function firstSpouseIsMain(marriage, members) {  
    if (marriage.between?.length > 0) {
        const firstSpouse = members.get(marriage.between[0]);
        return marriage.between.length === 2 && !firstSpouse.isAddOnSpouse; 
    }
    return false;
};

// returns true if both spouses in `marriage` each have 2 parents
function areSpouseParentsFull(marriage, members, levels) {
    if (marriage.between.length < 2) return false; 
    let parentsCount = 0;
    marriage.between.forEach((spouseID) => {
        const spouse = members.get(spouseID); 
        const parentMarr = getMarriage(levels, spouse.parentMarriage);
        if (parentMarr) parentsCount += parentMarr.between.length;
    });
    return parentsCount === 4;
};

// updates spouse distance for all non-empty marriages in given level
function adjustSpouseXDist(levelID, newDistance, members, levels) {
    const level = levels.get(levelID);
    if (level) {
         level.marriages.forEach((value) => {
            let marr = value;
            if (
                marr.between.length > 0 
                && isMainParent(marr.between[0], members, levels)
                && marr.spouseXDist !== newDistance
            ) {   
                marr.spouseXDist = newDistance;  
            }
        }); 
    }
};



// deletes member matching memberID & relevant family members
export function deleteMember(memberID, members, levels) {  
    if (memberID === 1) throw new Error("Cannot delete main user");
    if (!isMainParent(memberID, members, levels)) {
        deleteMemberDown(memberID, members, levels);
    } else {
        deleteMemberUp(memberID, members, levels);
    } 
    deleteEmpty(members, levels); 
    resetTrees(levels);
    positionMembers(members, levels);
};

function deleteMemberDown(memberID, members, levels) {
    const member = members.get(memberID);   
    const marr = getMarriage(levels, member.marriage);
    if (marr) {
        const spouse = getSpouse(memberID, marr, members);
        if (member.isAddOnSpouse) {
            // has children -> delete only `add-on` spouse 
            // no children -> also reset remaining `main` spouse's marriage 
            if (marr.children.length === 0) {   
                spouse.marriage = 0;
                marr.between = [spouse.memberID];
            }
        } else {
            // also delete `main` member's spouse/children
            if (marr.children.length > 0) { 
                marr.children.forEach((childID) => deleteMemberDown(childID, members, levels));
            }  
            if (spouse) markMemberToDelete(spouse, members, levels); 
        }
    }
    markMemberToDelete(member, members, levels);
};

// removes target  member from `treeData` 
async function markMemberToDelete (targetMember, members, levels) {
    members.delete(targetMember.memberID); 

    // deletes member from parent marriage 
    const parentMarr = getMarriage(levels, targetMember.parentMarriage);
    if (parentMarr) {
        parentMarr.children = parentMarr.children.filter((childID) => childID !== targetMember.memberID);
    }  
};


// deletes member & add-on spouses/siblings/parents 
// used for upper tree levels (levelID 0 ~ -3)
 function deleteMemberUp(memberID, members, levels) {
    const member = members.get(memberID); 
    const marr = getMarriage(levels, member.marriage); 

    if (marr) {
        marr.between = marr.between.filter((spouseID) => spouseID !== memberID);

        //delete member's `add-on` spouse
        const spouse = getSpouse(memberID, marr, members);
        if (spouse && spouse.isAddOnSpouse) {
            deleteMemberDown(spouse.memberID, members, levels);
        }
    }

    const parentMarr = getMarriage(levels, member.parentMarriage); 
    if (parentMarr) {
        //delete member's siblings & their spouses/children 
        parentMarr.children.forEach((childID) => {
            if (childID !== memberID) {
                deleteMember(childID, members, levels);
            }
        }); 

        //delete member's parents
        parentMarr.between.forEach((parentID) => deleteMemberUp(parentID, members, levels));
    }
    markMemberToDelete(member, members, levels);
};

// deletes empty marriages & levels from `treeData` and database
function deleteEmpty(members, levels) {   
    levels.map.forEach((value) => { 
        let lvl = value;  
        lvl.marriages.forEach((value) => { 
            let marr = value;
            const marrIsEmpty = marr.between.length < 2 && marr.children.length === 0;
            if (marrIsEmpty) {  
                levels.deleteMarriage(lvl.levelID, marr.marriageID);
            };
        });   
    });

    const lvlMemberCounts = Array.from(members.map.values()).reduce((acc, member) => {
        acc[member.level] = (acc[member.level] || 0) + 1;
        return acc;
    }, {});   

    levels.map.forEach((value) => {  
        let lvl = value;
        const lvlMembers = lvlMemberCounts[lvl.levelID];     
        const lvlIsEmpty = (lvlMembers === 0 || lvlMembers === undefined) && lvl.marriages.size === 0; 
        if (lvlIsEmpty) { 
            levels.delete(lvl.levelID);
        }
    }); 
};

// resets each level's `maxChildren` & `siblingXDist` & each marriage's `spouseXDist` to default values
function resetTrees (levels) {   
    levels.map.forEach((value) => {
        let lvl = value;
        if (lvl.levelID > -3) {  
            lvl.marriages.forEach((value) => {
                let marr = value; 
                marr.spouseXDist = SPOUSE_X_DISTANCE; 
            });  
            lvl.siblingXDist = SIBLING_X_DISTANCE;
        };
    });
};