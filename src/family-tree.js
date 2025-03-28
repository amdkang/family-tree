import * as drawTree from './draw-tree-utils.js';
import * as treeUtils from './tree-utils.js';
import { LevelMap, MemberMap } from './classes/UniqueIDMap.js';
import { Level } from "./classes/Level.js";
import { Marriage } from "./classes/Marriage.js";
import { Member } from "./classes/Member.js";

const defaultImgsCount = 5; 
let selectedImgPath = "../assets/avatar1.png";
let selectedMember = null; 
let selectMode = null;
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

const formDialog = document.querySelector("dialog");
const memberForm = document.getElementById("member-form");
const selectedMemberImg = document.getElementById("form-selected-img");
const nameInput = document.getElementById("name");   

window.onload = function () {  
    setupHeaderButtons();
    setupForm();    
    buildTree(); 
};   

function showElement(element) {
    let classes = element.classList;  
    if (classes.contains("hidden")) classes.remove("hidden"); 
};

function hideElement(element) {
    let classes = element.classList;  
    if (!classes.contains("hidden")) classes.add("hidden"); 
};

function createTooltip(tooltipText) {
    let tooltip = document.createElement("div");
    tooltip.className = "tooltip"; 
    let text = document.createElement("div");
    text.className = "tooltip-text";
    text.textContent = tooltipText; 
    let triangle = document.createElement("div");
    triangle.className = "tooltip-triangle"; 
    tooltip.append(triangle);
    tooltip.appendChild(text);
    return tooltip;
};

function setupHeaderButtons() {
    let subtitle = document.getElementById("subtitle");

    let addBtn = document.getElementById("add-btn"); 
    addBtn.onclick = () => {
        selectMode = "add";
        enterSelectMemberMode(subtitle, "Add To");
    };
    let addBtnBox = document.getElementById("add-btn-box");
    addBtnBox.append(createTooltip("Add Member"));

    let editBtn = document.getElementById("edit-btn");
    editBtn.onclick = () => {
        selectMode = "edit";
        enterSelectMemberMode(subtitle, "Edit");
    };
    let editBtnBox = document.getElementById("edit-btn-box");
    editBtnBox.append(createTooltip("Edit Member"));


    let deleteBtn = document.getElementById("delete-btn");
    deleteBtn.onclick = () => {
        selectMode = "delete";
        enterSelectMemberMode(subtitle, "Delete");
    };
    let delBtnBox = document.getElementById("delete-btn-box");
    delBtnBox.append(createTooltip("Delete Member")); 
};

function enterSelectMemberMode(subtitle, text) {
    subtitle.textContent = `Select Member Below to ${text}:`; 
    let subtitleBtn = document.getElementById("subtitle-btn");
    subtitleBtn.onclick = exitSelectMemberMode;
    showElement(subtitleBtn); 
};

function exitSelectMemberMode() {
    selectMode = null
    subtitle.textContent = "Map Your Family History with Ease"; 
    let subtitleBtn = document.getElementById("subtitle-btn");
    hideElement(subtitleBtn);
};



/** Tree Functions */ 

function buildTree() { 
    treeUtils.positionMembers(members, levels); 
    drawTree.drawTree(members, levels, handleMemberClick); 
};

// callback to add, edit, or delete selected member 
function handleMemberClick(selectedMemberID, memberNodeRect) {  
    if (selectMode) {
        selectedMember = members.get(selectedMemberID);    
        if (selectMode == "delete") {
            handleDelMember();
        } else { 
            // open form to add/edit member
            setFormValues();   
            formDialog.showModal(); 
 
            // position form next to selected member node
            let formRight = memberNodeRect.right + 30 + formDialog.offsetWidth; 
            if (formRight < window.innerWidth) {
                formDialog.style.left = `${ memberNodeRect.right + 30 }px`;
            } else {
                let rightPosition = memberNodeRect.right - 30 - formDialog.offsetWidth; 
                formDialog.style.right = `${ memberNodeRect.right - 30 }px`;
            }
            formDialog.style.top = "70px"; 
        } 
    }
};

function handleAddMember() { 
    const relation = document.querySelector('input[name="relation"]:checked').value;  
    const newMemberData = { name: nameInput.value, image: selectedImgPath }; 
    try {
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
    } catch (err) { 
        const snackbar = document.getElementById("snackbar");
        snackbar.textContent = err.message;
        snackbar.className = "show";
        setTimeout(function(){ 
            snackbar.className = snackbar.className.replace("show", ""); 
        }, 3000); 
    }
    buildTree();
};

function handleEditMember() {   
    let member = members.get(selectedMember.memberID);
    member.name = nameInput.value;
    member.image = selectedImgPath; 
    buildTree();
};

function handleDelMember() {
    treeUtils.deleteMember(selectedMember.memberID, members, levels);
    buildTree();
};



/** Add/Edit Member Form Functions */ 

function setupForm() {  
    setupImgSelector();  
    dragForm(formDialog);
    document.getElementById("cancel-btn").onclick = closeForm;
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") closeForm(); 
    });

    memberForm.onsubmit = (event) => {
        event.preventDefault();
        if (selectMode == "add") {
            handleAddMember(); 
        } else if (selectMode == "edit") {
            handleEditMember();
        } 
        closeForm();
    };
}; 

function setFormValues() { 
    let header = document.getElementById("form-header"); 
    let addMemberSection = document.getElementById("form-new-member-section"); 
    if (selectMode == "add") {
        header.textContent = "Add a New Member"; 
        showElement(addMemberSection);
        document.getElementById("selected-member-img").src = selectedMember.image;
        document.getElementById("selected-member-name").textContent = selectedMember.name; 
    } else {
        header.textContent = "Edit Member"
        hideElement(addMemberSection);
        selectedMemberImg.src = selectedMember.image; 
        nameInput.value = selectedMember.name; 
    } 
};

// setup area to select or upload member image
function setupImgSelector() {
    const imgSelector = document.getElementById("form-default-img-options");  
    selectedMemberImg.src = selectedImgPath; 

    // set default selectable images
    for (let i = 1; i <= defaultImgsCount; i++) { 
        let imgName = `../assets/avatar${i}.png`;
        let img = document.createElement("img");
        img.className = "default-img";
        img.src = imgName;  
        img.onclick = () => {
            selectedImgPath = imgName;
            selectedMemberImg.src = imgName; 
        };
        imgSelector.append(img);
    }; 
    imgSelector.append(createCustomImgSelector());
};

// setup option to upload custom member image 
function createCustomImgSelector() {
    let customImgSelector = document.createElement("label");
    customImgSelector.id = "custom-img-selector"; 
    customImgSelector.className = "btn-with-tooltip";
    customImgSelector.textContent = "+"; 
    customImgSelector.append(createTooltip("Upload an Image"));

    let fileInput = document.createElement("input");
    let fileInputErr = document.getElementById("file-error-msg");
    fileInput.type = "file";
    fileInput.accept="image/*";
    fileInput.onchange = () => {   
        const files = fileInput.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith("image/")) {
                hideElement(fileInputErr); 
                const reader = new FileReader(); 
                reader.onload = function (event) { 
                    // set uploaded file as member's image
                    selectedImgPath = event.target.result;
                    selectedMemberImg.src = selectedImgPath;  
                }; 
                reader.readAsDataURL(file);
            } else {
                showElement(fileInputErr); 
            }
        }
    }  
    customImgSelector.append(fileInput);
    return customImgSelector;
};

function closeForm() {  
    let fileInputErr = document.getElementById("file-error-msg");
    nameInput.value = ""; 
    hideElement(fileInputErr);
    selectedMember = null;
    selectedImgPath = "../assets/avatar1.png";
    selectedMemberImg.src = selectedImgPath;  
    memberForm.reset();
    exitSelectMemberMode();
    formDialog.close();
};

// setup form's draggable functionality
function dragForm(form) {
    const formHeader = document.getElementById("form-header"); 
    formHeader.onmousedown = dragMouseDown;
    var newMouseX = 0, newMouseY = 0, startMouseX = 0, startMouseY = 0;

    function dragMouseDown(event) { 
        event.preventDefault();
        // get starting cursor position
        startMouseX = event.clientX;
        startMouseY = event.clientY;
        document.onmouseup = stopDrag; 
        document.onmousemove = startDrag;
    } 
    
    function startDrag(event) { 
        event.preventDefault();
        // calculate + set new cursor position
        newMouseX = startMouseX - event.clientX;
        newMouseY = startMouseY - event.clientY;
        startMouseX = event.clientX;
        startMouseY = event.clientY; 
        form.style.top = `${ form.offsetTop - newMouseY }px`;
        form.style.left = `${ form.offsetLeft - newMouseX }px`;
    }
  
    function stopDrag() { 
        document.onmouseup = null;
        document.onmousemove = null;
    }
};