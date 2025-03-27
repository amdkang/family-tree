class Member {
    constructor({ memberID, level, x = 0, y = 0, parentMarriage = 0, marriage = 0, isAddOnSpouse = false, name, image = "../assets/avatar1.png" } = {}) {
        this.memberID = memberID;
        this.level = level; 
        this.x = x;
        this.y = y;
        this.parentMarriage = parentMarriage;
        this.marriage = marriage;
        this.isAddOnSpouse = isAddOnSpouse; 
        this.name = name;
        this.image = image;
    }  
};

export { Member };