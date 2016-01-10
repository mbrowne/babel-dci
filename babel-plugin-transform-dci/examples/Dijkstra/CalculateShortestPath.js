/* @flow */

//IN PROGRESS

/**
 * Calculate the shortest path between two points using the Dijkstra algorithm.
 * Based on the Marvin implementation by Rune Funch
 */
export default function CalculateShortestPath(node: Node, graph: Graph) {
	graph.updateDistance(node, 0);
	
	let neighbors = node.neighbors().keys();
	if (neighbors.length == 0) return graph.previous;
	
	neighbors.forEach(function(neighbor) {
		var alt = node.distance() + node.distanceTo(neighbor);
		if (alt < graph.distances.get(neighbor)) {
			graph.updateDistance(neighbor, alt);
			node.setAsPreviousOf(neighbor);
		}
	});
	
	graph.removeNode();
	let nearestNode = Node.neighborWithShortestPath();
	CalculateShortestPath(nearestNode, graph);
	return graph.previous;

	
	role graph {
		distanceBetween(node: Node, otherNode: Node) {
			return self.nodes.get(node).get(otherNode);
		}
		
		removeNode(node: Node) {
			self.nodes.remove(node);
		}
		
		updateDistance(node: Node, distance: number) {
			self.distances[node] = distance;
		}
	}
	
	role node {
		neighbors() {
			return graph.nodes.get(self);
		}
		
		distance() {
			return graph.distances.get(self);
		}
		
		setAsPreviousOf(node) {
			graph.previous.set(node, self);
		}
		
		distanceTo(otherNode) {
			return graph.distanceBetween(self, otherNode);
		}
		
		neighborWithShortestPath() {
			let neighbor,
				shortestDistance = Infinity;
				
			graph.distances.forEach(function(val, node) {
				if (val < shortestDistance) {
					shortestDistance = val;
					neighbor = node;
				}
			});
			return neighbor;
		}
	}	
}