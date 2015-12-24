//TEMP
const log = console.log;

export default function({types: t}) {
	return {
		inherits: require("babel-plugin-syntax-dci"),
	
		visitor: {
			FunctionDeclaration: {
				exit(path) {
					let node = path.node;
					let childNodes = node.body.body;
					let roleAssignments = [];
					//2-dimensional map of role methods indexed by role name and then by method name
					let roleMethods = {};
					
					//Create objects for the role methods
					let nodesToKeep = [];
					if (Array.isArray(childNodes)) {
						let roleName;
						for (let n of childNodes) {
							if (n.type == "RoleDeclaration") {
								roleName = n.id.name;
								roleMethods[roleName] = indexRoleMethodsByName(n);
								
								//__context.__$[[roleName]] = {...}
								roleAssignments.push(t.AssignmentExpression(
									'=',
									t.MemberExpression(t.Identifier('__context'), t.Identifier('__$' + roleName)),
									roleDeclAsObj(n)
								));
							}
							else nodesToKeep.push(n);
						}
					}
					node.body.body = nodesToKeep;
					node.isDCIContext = (roleAssignments.length > 0);
			
					if (!node.isDCIContext) {
						return;
					}
					
					//Initialize __context variable
					//
					//var __context = {}
					//
					//TODO
					//if it's a constructor function, __context is set to 'this'; otherwise, create an empty object to
					//be used as a container to hold the role methods.
					//
					//Would it be possible to detect whether we're generating a commonjs or AMD mode here rather than checking for
					//both global and window at runtime? But what about UMD modules intended to run in either environment?
					//
					//var __context = (this===undefined || (typeof global !== 'undefined' && this === global) || (typeof window !== 'undefined' && this === window) ? {}: this);					
					let ctxAssignment = t.VariableDeclaration('var', [
						t.VariableDeclarator(
							t.Identifier('__context'),
							t.ObjectExpression([])
						)
					]);
					
					//add initialization code to top of function declaration
					node.body.body = [ctxAssignment].concat(roleAssignments, node.body.body);
					
					transformCallExpressions(path, roleMethods);
				}
			}
		}
	}
	
	function indexRoleMethodsByName(roleDecl) {
		let roleMethods = roleDecl.body.body;
		for (let m of roleMethods) {
			roleMethods[m.key.name] = m;
		}
		return roleMethods;
	}
	
	function roleDeclAsObj(roleDecl) {
		let roleMethods = roleDecl.body.body;
		let props = new Array(roleMethods.length);
		roleMethods.forEach(function(method, i) {
			props[i] = t.ObjectProperty(
				method.key,
				t.FunctionExpression(null, method.params, method.body, method.generator, method.async)
			);
			//props[i] = t.ObjectMethod(method.kind, method.key, method.params, method.body, method.computed);
		});
		return t.ObjectExpression(props);
	}
	
	//Transform call statements
	//from [[roleName]].[[methodName]](...)
	//to __context.roles.[[roleName]].[[methodName]].call([[rolePlayer]], ...)
	function transformCallExpressions(path, roleMethods) {
		path.traverse(
			{CallExpression(subPath) {
				let callee = subPath.node.callee;
	
				//TODO
				//instance methods
	
				if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier'
					&& callee.object.name in this.roleMethods
					&& callee.property.name in this.roleMethods[callee.object.name])
				{
					let roleId = callee.object,
						methodId = callee.property;						
		
					//__context.roles.[[roleName]].[[methodName]].call([[rolePlayer]], ...);
					subPath.replaceWith(t.CallExpression(
						//build expression resolving to call() method of role method
						t.MemberExpression(
							t.MemberExpression(
								t.MemberExpression(
									t.Identifier('__context'),
									t.Identifier('__$' + roleId.name)
								),
								methodId
							),
							t.Identifier('call')
						),
			
						//arguments
						[roleId].concat(subPath.node.arguments)
					));
				}
			}},
			{roleMethods}
		);
	}
}