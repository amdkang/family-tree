import * as drawTree from './draw-tree-utils.js';
import * as treeUtils from './tree-utils.js';
import { LevelMap, MemberMap } from './classes/UniqueIDMap.js';
import { Level } from "./classes/Level.js";
import { Marriage } from "./classes/Marriage.js";
import { Member } from "./classes/Member.js";

const imgsCount = 5; 
let selectedImgName = "/assets/avatar1.png";
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
const formDialog = document.getElementById('member-form');


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

   // Get window and element dimensions
   const windowWidth = window.innerWidth;
   const windowHeight = window.innerHeight;

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    let x = Math.max(0, Math.min(windowWidth - 500, e.clientX-25));
    let y = Math.max(0, Math.min(windowHeight - 480, e.clientY-25));
    // set the element's new position:
    elmnt.style.left = x + "px";
    elmnt.style.top = y + "px"; 
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
    selectedImgName = "/assets/avatar1.png";
    const selectedImg = document.getElementById("selected-img");
    selectedImg.src = selectedImgName; 
    let form = document.getElementById("member-form");
    form.reset();
    dialog.close();
};

// Callback to update selectedItem
function handleMemberClick(selectedMemberID, memberNode, event) { 
    setupForm(selectedMemberID);   
    dialog.style.left = `${memberNode.right + 30}px`;
    dialog.style.top = `${memberNode.top + 50 - 240}px`; 

    dialog.showModal(); 
};

function setupForm(selectedMemberID) { 
    selectedMember = members.get(selectedMemberID);   

    let title = document.getElementById("dialog-header");
    let formBottomSection = document.getElementById("form-bottom-section");    
    let classes = formBottomSection.classList;
    let selectedImg = document.getElementById("selected-img");
    if (formType == "add") {
        title.textContent = "Add a New Member";
        if (classes.contains("hidden")) classes.remove("hidden");
        let selectedMemberImg = document.getElementById("selected-member-img");
        selectedMemberImg.src = selectedMember.image;
        let selectedMembername = document.getElementById("selected-member-name");
        selectedMembername.textContent = selectedMember.name; 
    } else {
        title.textContent = "Edit Member"
        if (!classes.contains("hidden")) classes.add("hidden"); 
        selectedImg.src = selectedMember.image;
        let nameInput = document.getElementById("name");
        nameInput.value = selectedMember.name; 
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
    console.log('members: ', members);
    buildTree();
}

function setupImgSelector() {
    const imgSelector = document.getElementById("default-imgs"); 
    const selectedImg = document.getElementById("selected-img");
    selectedImg.src = selectedImgName; 

    for (let i = 1; i <= imgsCount; i++) { 
        let imgName = `/assets/avatar${i}.png`;
        let img = document.createElement("img");
        img.className = "default-img";
        img.src = imgName;  
        img.addEventListener("click", () => {
            selectedImgName = imgName;
            selectedImg.src = imgName;  
        });
        imgSelector.append(img);
    };

    let customImg = document.createElement("label");
    customImg.id = "custom-img"; 
    customImg.textContent = "+";
    let tooltip = createTooltip("Upload an Image");
    customImg.append(tooltip);
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = () => { 
        console.log(fileInput.files);
        const files = fileInput.files;
        if (files.length > 0) {
            const file = files[0];
            const reader = new FileReader(); 
            reader.onload = function (e) {
                selectedImgName = e.target.result;
                selectedImg.src = selectedImgName; 
                
            }; 
            reader.readAsDataURL(file);
        }
    }  
    customImg.append(fileInput);
    imgSelector.append(customImg);
}; 

function createTooltip(tooltipText) {
    let tooltip = document.createElement("div");
    tooltip.className = "tooltip"; 
    let text = document.createElement("div");
    text.className = "tooltip-text";
    text.textContent = tooltipText; 
    tooltip.appendChild(text);
    return tooltip;
};