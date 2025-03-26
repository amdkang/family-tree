import * as drawTree from './draw-tree-utils.js';
import * as treeUtils from './tree-utils.js';
import { LevelMap, MemberMap } from './classes/UniqueIDMap.js';
import { Level } from "./classes/Level.js";
import { Marriage } from "./classes/Marriage.js";
import { Member } from "./classes/Member.js";

const imgsCount = 5; 
let selectedImgName = "avatar1.png";
let selectedMember = null;
let formType = "edit";

var levels = new LevelMap(
    new Map([
        [-1, 
            new Level({
                levelID: -1,
                marriages: new Map([
                    [1, new Marriage({ marriageID: 1, levelID: -1, children: [1] })]
                ])
            })  
        ],
        [0, new Level({ levelID: 0 })]
    ]),
    [1]
); 

var members = new MemberMap(
    new Map([
        [1, new Member({ memberID: 1, name: "me", level: 0, parentMarriage: 1 })] 
    ]), 
    [1]
);    


const dialog = document.querySelector("dialog");
const formDialog = document.getElementById('add-member-form');


window.onload = function () { 
    setupDialog(); 
    // treeUtils.addParent({ name: "mom" }, 1, members, levels);   
    // treeUtils.addParent({ name: "dad" }, 1, members, levels);    
    // treeUtils.addSibling({ name: "sis"}, 1, members, levels); 
    // treeUtils.addSibling({ name: "aunt"}, 2, members, levels); 
    // treeUtils.addChild({ name: "aunt son"}, 5, members, levels);
    // treeUtils.addParent({ name: "gma" }, 2, members, levels);   
    // treeUtils.addParent({ name: "gpa" }, 5, members, levels);   
    buildTree();
};   

function buildTree() { 
    treeUtils.positionMembers(members, levels); 
    drawTree.drawTree(members, levels, handleMemberClick); 
}



dragElement(document.getElementById("edit-tree-dialog"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById("dialog-header")) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById("dialog-header").onmousedown = dragMouseDown;
  } else {
    /* otherwise, move the DIV from anywhere inside the DIV:*/
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}


// form dialog functions
 
function setupDialog() {  
    setupImgSelector();  
    formDialog.addEventListener("submit", (event) => {
        event.preventDefault();  
        if (formType == "add") {
            handleAddMember(); 
        } else {
            handleEditMember();
        } 
        closeForm(); 
    }); 
    const cancelButton = document.getElementById("cancel-btn");  
    cancelButton.addEventListener("click", closeForm);
}; 

function closeForm() { 
    selectedMember = null;
    selectedImgName = "avatar1.png";
    const selectedImg = document.getElementById("selected-img");
    selectedImg.src = `/assets/${selectedImgName}`; 
    let form = document.getElementById("add-member-form");
    form.reset();
    dialog.close();
};

// Callback to update selectedItem
function handleMemberClick(selectedMemberID) { 
    setupForm(selectedMemberID);
    dialog.showModal(); 
};

function setupForm(selectedMemberID) { 
    selectedMember = members.get(selectedMemberID);  
    let selectedMemberImg = document.getElementById("selected-member-img");
    selectedMemberImg.src = `/assets/${ selectedMember.image }`;
    let selectedMembername = document.getElementById("selected-member-name");
    selectedMembername.textContent = selectedMember.name;

    let title = document.getElementById("dialog-header");
    let formBottomSection = document.getElementById("form-bottom-section");    
    let classes = formBottomSection.classList;
    let selectedImg = document.getElementById("selected-img");
    if (formType == "add") {
        title.textContent = "Add a New Member";
        if (classes.contains("hidden")) classes.remove("hidden");
    } else {
        title.textContent = "Edit Member"
        if (!classes.contains("hidden")) classes.add("hidden"); 
        selectedImg.src = `/assets/${ selectedMember.image }`;
        let nameInput = document.getElementById("name");
        nameInput.textContent = selectedMember.name;
    } 
} 

function handleAddMember() { 
    const name = document.getElementById('name').value;   
    const relation = document.querySelector('input[name="relation"]:checked').value;  
    const newMemberData = { name: name, image: selectedImgName }; 
    switch (relation) {
        case "child":
            treeUtils.addChild(newMemberData, selectedMember.memberID, members, levels);
            break;
        case "parent":
            treeUtils.addParent(newMemberData, selectedMember.memberID, members, levels);
            break;
        case "sibling":
            treeUtils.addSibling(newMemberData, selectedMember.memberID, members, levels);
            break;
        case "spouse":
            treeUtils.addSpouse(newMemberData, selectedMember.memberID, members, levels);
            break;
        default:
            break;
    };
    buildTree();
};

function handleEditMember() {
    const name = document.getElementById('name').value;   
    let member = members.get(selectedMember.memberID);
    member.name = name;
    member.image = selectedImgName;
    buildTree();
}

function setupImgSelector() {
    const imgSelector = document.getElementById("default-imgs"); 
    const selectedImg = document.getElementById("selected-img");
    selectedImg.src = `/assets/${selectedImgName}`; 

    for (let i = 1; i <= imgsCount; i++) { 
        let imgName = `avatar${i}.png`;
        let img = document.createElement("img");
        img.className = "default-img";
        img.src = `/assets/avatar${i}.png`;  
        img.addEventListener("click", () => {
            selectedImgName = imgName;
            selectedImg.src = `/assets/${imgName}`;  
        });
        imgSelector.append(img);
    };
};
