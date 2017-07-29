/* @flow */

//IN PROGRESS

/**
 * Calculate the shortest path between two points using the Dijkstra algorithm.
 * Based on the Marvin implementation by Rune Funch
 */
export default function CalculateShortestPath(node: Node, graph: Graph) {
	graph.updateDistance(node, 0);
	
	const neighbors = node.neighbors().keys();
	if (neighbors.length == 0) return graph.previous;
	
	for (let neighbor of neighbors) {
		const alt = node.distance() + node.distanceTo(neighbor);
		if (alt < graph.distances.get(neighbor)) {
			graph.updateDistance(neighbor, alt);
			node.setAsPreviousOf(neighbor);
		}
	}
	
	graph.removeNode();
	const nearestNode = Node.neighborWithShortestPath();
	CalculateShortestPath(nearestNode, graph);
	return graph.previous;

	
	role graph {
		distanceBetween(node: Node, otherNode: Node) {
			return this.nodes.get(node).get(otherNode);
		}
		
		removeNode(node: Node) {
			this.nodes.remove(node);
		}
		
		updateDistance(node: Node, distance: number) {
			this.distances[node] = distance;
		}
	}
	
	role node {
		neighbors() {
			return graph.nodes.get(this);
		}
		
		distance() {
			return graph.distances.get(this);
		}
		
		setAsPreviousOf(node) {
			graph.previous.set(node, this);
		}
		
		distanceTo(otherNode) {
			return graph.distanceBetween(this, otherNode);
		}
		
		neighborWithShortestPath() {
			let neighbor,
				shortestDistance = Infinity;
			graph.distances.forEach((val, node) => {
				if (val < shortestDistance) {
					shortestDistance = val;
					neighbor = node;
				}
			});
			return neighbor;
		}
	}	
}