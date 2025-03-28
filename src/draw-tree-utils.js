const primaryColor = "#6a5acd";
const contrastColor = "#fff";
const NODE_TOP_CONNECTOR_LENGTH = 10;
const NODE_RADIUS = 50;  
const textTransform = `(${ NODE_RADIUS }, ${ NODE_RADIUS*2 + 20 })`;
let nodeLines = []; 
let members = [], levels = [];

export function drawTree(membersData, levelsData, handleMemberClick) {
    members = membersData;
    levels = levelsData;
    clearTree(); 
    createNodes(handleMemberClick);
    positionNodes();
    positionLines();
    drawLines();
    setSVGViewbox();  
} 

function clearTree() {
    const svg = d3.select("#tree-svg");
    svg.selectAll("*").remove();
    nodeLines = [];
};


function createNodes (handleMemberClick) { 
    const svg = d3.select("#tree-svg");
    const nodeContainer = svg.append("g").attr("id", "nodes-container"); 

    // create/bind each member's data to a node
    const nodes = nodeContainer.selectAll("g") 
        .data(Array.from(members.map.values()), d => d.memberID) 
        .enter()
        .append("g")
        .attr("id", d => `g-${ d.memberID }`)
        .attr("transform", `translate(0, 0)`)
        .on("click", function(event, d) { 
            const memberNode = document.getElementById(`g-${d.memberID}`); 
            const memberNodeRect = memberNode.getBoundingClientRect(); 
            handleMemberClick(d.memberID, memberNodeRect, event); 
        })
        .on("mouseover", function() { // highlights node 
            d3.select(this).select("circle").attr("stroke", primaryColor);
            d3.select(this).selectAll("tspan").attr("stroke", primaryColor);
            d3.select(this).selectAll("tspan").attr("fill", primaryColor);
        })
        .on("mouseleave", function() { // removes highlight from node
            
            d3.select(this).select("circle").attr("stroke", contrastColor);
            d3.select(this).selectAll("tspan").attr("stroke", contrastColor);
            d3.select(this).selectAll("tspan").attr("fill", contrastColor);
        })
        .style("cursor", "pointer");

    nodes.each(function (d) {   
        // const splitName = splitStringByCharLength((member.fullName), 15);
        
        // set border around member picture
        d3.select(this)
            .append("circle")
            .attr("fill", "none")
            .attr("stroke", contrastColor)
            .attr("stroke-width", 2) 
            .attr("r", NODE_RADIUS+1)
            .attr("id", d => `circle-${ d.memberID }`)
            .attr("cx", NODE_RADIUS)  
            .attr("cy", NODE_RADIUS)
            .attr("transform", `translate(0,0)`);

        // add member picture
        d3.select(this)
            .append("image")
            .attr("id", d => `image-${ d.memberID }`)
            .attr("href", d.image)
            .attr("width", NODE_RADIUS*2)
            .attr("height", NODE_RADIUS*2)   
            .attr("clip-path", "inset(0% round 50%)");
        
        // add member name below node
        d3.select(this)
            .append("text")
            .attr("id", d => `text-${ d.memberID }`)
            .attr("transform", `translate${ textTransform }`)
            .style("text-anchor", "middle")
            .selectAll("tspan")
            // .data(splitName)
            .data(d.name)
            .enter()
            .append("tspan")
            .text(d => d)
            .attr("stroke", contrastColor)
            .attr("fill", contrastColor)
            .attr("font-size", "17px") 
            .attr("font-weight", "200")
            .attr("letter-spacing", "1");
    });

    // handle zoom/panning within nodes container
    const zoom = d3.zoom()
        .scaleExtent([0.5, 2])
        .filter(filter)
        .on("zoom", zoomed);
    svg.call(zoom);

    function filter(event) {
        event.preventDefault();
        return (!event.ctrlKey || event.type === "wheel") && !event.button;
    };

    function zoomed(event) {
        const {transform} = event;
        nodeContainer.attr("transform", transform);
        svg.selectAll("line").attr("transform", transform);
    };
}; 

// returns x,y values for specified element's `translation`
const getElementPosition = (id, elementType) => {
    const svg = d3.select("#tree-svg"); 
    const element = svg.select(`#${ elementType }-${ id }`); 
    const transformAttr = element.attr("transform"); 
    const match = transformAttr.match(/translate\(([^,]+),([^,]+)\)/);
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
};

// returns specified element's bounds (adjusted for translations)
const getElementBounds = (id, elementType) => {
    const svg = document.getElementById("tree-svg");
    const element = svg.getElementById(`${elementType}-${id}`);
    const elementBBox = element.getBBox();
    const memberPosition = getElementPosition(id, elementType);
    elementBBox.x += memberPosition.x;
    elementBBox.y += memberPosition.y;
    return elementBBox; 
};
 
const positionNodes = () => {  
    members.map.forEach((value) => {  
        let member = value;
        // moves member node by specified coordinates 
        const translateBy = { x: member.x, y: member.y }; 
        const svg = d3.select("#tree-svg"); 
        const node = svg.select(`#g-${ member.memberID }`); 
        node.attr("transform", `translate(${ translateBy.x },${ translateBy.y })`);
    });
};

// positions connecting lines between member nodes
const positionLines = () => {
    levels.map.forEach((value) => {
        let level = value; 
        level.marriages.forEach((value) => {
            let marr = value;
            if (marr.between.length > 0) connectParentChildNodes(marr);
            if (marr.children.length > 1) connectSiblingNodes(marr);
        });
    });
};

// draws connecting lines between member nodes
const drawLines = () => {  
    const svg = d3.select("#tree-svg");
    svg.selectAll("line")
        .data(nodeLines)
        .enter()
        .append("line")
        .attr("x1", d => d.start.x)
        .attr("y1", d => d.start.y)
        .attr("x2", d => d.end.x)
        .attr("y2", d => d.end.y)
        .attr("stroke", contrastColor)
        .attr("stroke-width", 2); 
};

// returns spouses in order [left spouse, right spouse]
const getSpouseOrder = (spouseIDs) => {  
    switch (spouseIDs.length) { 
        case 1: 
            return [spouseIDs[0]];
        case 2:
            const spouse1 = members.get(spouseIDs[0]); 
            const spouse2 = members.get(spouseIDs[1]);  
            if (Number(spouse1.x) < Number(spouse2.x)) { 
                return [spouseIDs[0], spouseIDs[1]];
            } else { 
                return [spouseIDs[1], spouseIDs[0]];;
            }
        default: 
            return []
    }
};

// position/connects spouse nodes + positions vertical parent-child line
const connectParentChildNodes = (marr) => { 
    const spouseOrder = getSpouseOrder(marr.between);  
    const parent1Position = getElementPosition(spouseOrder[0], "g");
    let parentChildLine = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };  

    // sets start position for parent-child line
    if (marr.between.length === 1) {
        // 1 parent -> use parent's name as start point for parent-child line
        const parent1Text = getElementBounds(spouseOrder[0], "text");
        parent1Text.x += parent1Position.x;
        parent1Text.y += parent1Position.y;
        parentChildLine.start = {
            x: parent1Text.x + parent1Text.width/2 - 1,
            y: parent1Text.y + parent1Text.height + 4
        };  
    } else if (marr.between.length === 2) {
        // 2 parents -> spouse-marriage line's midpoint as start point for parent-child line
        const parent1Circle = getElementBounds(spouseOrder[0], "circle"); 
        parent1Circle.x += parent1Position.x;
        parent1Circle.y += parent1Position.y; 

        const parent2Position = getElementPosition(spouseOrder[1], "g");
        const parent2Circle = getElementBounds(spouseOrder[1], "circle"); 
        parent2Circle.x += parent2Position.x;
        parent2Circle.y += parent2Position.y; 

        const spouseMarriageLine = {
            start: {
                x: parent1Circle.x + (NODE_RADIUS * 2),
                y: parent1Circle.y + NODE_RADIUS
            },
            end: {
                x: parent2Circle.x,
                y: parent2Circle.y + NODE_RADIUS
            }
        };   
        nodeLines.push(spouseMarriageLine); 

        parentChildLine.start = {
            x: (parent1Circle.x + NODE_RADIUS * 2 + parent2Circle.x) / 2,
            y: parent1Circle.y + NODE_RADIUS
        };
    }
    
    // set end position for parent-child line
    if (marr.children.length > 0) {
        const midChildIndex = Math.floor(marr.children.length / 2);
        const midChild = members.get(marr.children[midChildIndex]);
        const midChildPosition = getElementPosition(midChild.memberID, "g");
        const midChildCircle = getElementBounds(midChild.memberID, "circle");
        midChildCircle.x += midChildPosition.x
        midChildCircle.y += midChildPosition.y; 

        // odd # kids -> use middle child node as end point 
        // even # kids -> middle 2 childrens' sibling line's midpoint as end point  
        parentChildLine.end.x = parentChildLine.start.x; 
        parentChildLine.end.y = marr.children.length > 1 ? 
            midChildCircle.y - NODE_TOP_CONNECTOR_LENGTH : midChildCircle.y;
        nodeLines.push(parentChildLine); 
    }
};

// position/connects sibling lines between children nodes 
const connectSiblingNodes = (marr) => {
    for (let i = 0; i < marr.children.length-1; i++) { 
        // positions vertical line from top of child nodes to horizontal sibling line 
        const sibling1Position = getElementPosition(marr.children[i], "g");
        const sibling1Circle = getElementBounds(marr.children[i], "circle");
        sibling1Circle.x += sibling1Position.x;
        sibling1Circle.y += sibling1Position.y;
        let nodeTopConnectorLine = {
            start: { x: sibling1Circle.x + NODE_RADIUS, y: sibling1Circle.y },
            end: { x: sibling1Circle.x + NODE_RADIUS, y: sibling1Circle.y - NODE_TOP_CONNECTOR_LENGTH }
        };
        nodeLines.push(nodeTopConnectorLine);

        const sibling2Position = getElementPosition(marr.children[i+1], "g");
        const sibling2Circle = getElementBounds(marr.children[i+1], "circle");
        sibling2Circle.x += sibling2Position.x;
        sibling2Circle.y += sibling2Position.y;
        nodeTopConnectorLine = {
            start: { x: sibling2Circle.x + NODE_RADIUS, y: sibling2Circle.y },
            end: { x: sibling2Circle.x + NODE_RADIUS, y: sibling2Circle.y - NODE_TOP_CONNECTOR_LENGTH }
        };
        nodeLines.push(nodeTopConnectorLine);

        // positions horizontal sibling line connecting above `NodeTopConnectorLines` 
        const siblingConnectorLine = {
            start: { x: sibling1Circle.x + NODE_RADIUS, y: sibling1Circle.y - NODE_TOP_CONNECTOR_LENGTH },
            end: { x: sibling2Circle.x + NODE_RADIUS, y: sibling2Circle.y - NODE_TOP_CONNECTOR_LENGTH }
        };
        nodeLines.push(siblingConnectorLine);
    }
};

// set coordinates (0,0) as svg's center
const setSVGViewbox = () => { 
    const svg = document.getElementById("tree-svg");
    const width = svg.clientWidth;
    const height = svg.clientHeight; 
    svg.setAttribute('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`); 
};