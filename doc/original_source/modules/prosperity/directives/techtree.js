'use strict';

angular.module('prosperity')
    .directive('techTree', ['$rootScope', 'Player', 'Engine',
        function($rootScope, Player, Engine) {
            return {
                template: '<div class="md-padding"><h4>Points to spend: {{sectorObj.points || 0}}</h4>',
                restrict: 'EA',
                scope: {
                    sectorid: '@'
                },
                link: function postLink(scope, element, attrs) {

                    var _techTree = $rootScope.techTree;
                    scope.sectorObj = $rootScope.itemList[scope.sectorid];

                    scope.$watch('sectorObj.curLevel', function(oldval, newval) {
                        //console.log('sectorObj ' + scope.sectorObj.name, oldval, newval);
                        var sector = scope.sectorObj;
                    });

                    function create() {
                        for (var i = 0; i < _techTree.children.length; i++) {
                            var s = _techTree.children[i];
                            if (s.id === scope.sectorid) {
                                scope.sector = $.extend(true, {}, s);
                            }
                        }

                        purge(scope.sector);
                        hideUnavailable(scope.sector);

                    }

                    function meetsPrereq(obj) {
                        var pass = true;
                        if (obj.requires) {
                            if (obj.requires.unlocked) {
                                pass = $rootScope.itemList[obj.requires.unlocked].unlocked;
                            }
                        }
                        return pass;
                    }

                    function meetsEvent(obj){
                        var pass = true;
                        if (obj.requires) {
                            if (obj.requires.event) {
                                pass = $rootScope.player.events[obj.requires.event];
                            }
                        }
                        return pass;
                    }
                    function meetsPlace(obj){
                        var pass = true;
                        if (obj.requires) {
                            if (obj.requires.place) {
                                pass = $rootScope.itemList[obj.requires.place].unlocked;
                            }
                        }
                        return pass;
                    }

                    function meetsReq(obj) {
                        return meetsEvent(obj) && meetsPrereq(obj) && meetsPlace(obj);
                    }

                    //purge the tech nodes that are hidden and not yet unlocked
                    function purge(node) {
                        for (var i = 0; i < node.children.length; i++) {
                            var n = node.children[i];

                            if (n.obj) {
                                var isHidden = !n.obj.unlocked && n.obj.hidden;
                                var meetsEvent = true,
                                    meetsPlace = true;
                                if (n.obj.requires) {
                                    if (n.obj.requires.event) {
                                        meetsEvent = $rootScope.player.events[n.obj.requires.event];
                                    }
                                    if (n.obj.requires.place) {
                                        meetsPlace = $rootScope.itemList[n.obj.requires.place].unlocked;
                                    }
                                }

                                if (isHidden || !meetsEvent) {
                                    node.children.splice(i, 1);
                                    i--;
                                } else {
                                    purge(n);
                                }
                            } else {
                                purge(n);
                            }
                        }
                    }

                    function hideUnavailable(node) {
                        var tech = node.obj;
                        if (!tech.unlocked && tech.type === "upgrade") {
                            node.children.forEach(function(n) {
                                n.children = [];
                            });
                        } else {
                            for (var i = 0; i < node.children.length; i++) {
                                hideUnavailable(node.children[i]);
                            }
                        }
                    }

                    function calcHeight(tree, root, width, height) {
                        var levelWidth = [1];
                        var maxDepth = 0;
                        var childCount = function(level, n) {
                            if (level > maxDepth) {
                                maxDepth = level;
                            }
                            if (n.children && n.children.length > 0) {
                                if (levelWidth.length <= level + 1) levelWidth.push(0);

                                levelWidth[level + 1] += n.children.length;
                                n.children.forEach(function(d) {
                                    childCount(level + 1, d);
                                });
                            }
                        };
                        childCount(0, root);
                        var newHeight = Math.min(d3.max(levelWidth) * 70, height - 50);
                        var newWidth = Math.min(maxDepth * 230, width - 200);
                        tree = tree.size([newHeight, newWidth]);

                        //console.log('tree height: ' + newHeight);
                    }

                    function draw() {
                        if (scope.sector) {
                            var _sector = scope.sector;

                            var width = 1200,
                                height = 1000,
                                scaleX = 1,
                                scaleY = 1;

                            var cluster = d3.layout.tree();
                            //.size([height, width]);

                            calcHeight(cluster, _sector, width, height);

                            var diagonal = d3.svg.diagonal()
                                .projection(function(d) {
                                    return [d.y * scaleY, d.x * scaleX];
                                });
                            d3.select(element[0]).select("svg").remove();
                            var svg = d3.select(element[0]).append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .append("g")
                                .attr("transform", "translate(50,0)")
                                .attr("style", "position: relative");

                            var tooltip = d3.select(element[0]).append("div")
                                .attr("class", "techTooltip")
                                .style("visibility", "hidden");

                            var nodes = cluster.nodes(_sector),
                                links = cluster.links(nodes);

                            var link = svg.selectAll(".link")
                                .data(links)
                                .enter().append("path")
                                .attr("class", "link")
                                .attr("d", diagonal);

                            var node = svg.selectAll(".node")
                                .data(nodes)
                                .enter().append("g")
                                .attr("class", function(d) {
                                    if (d.obj.unlocked) {
                                        return "node unlocked"
                                    } else if (d.obj.type === 'sector') {
                                        return "node sectornode"
                                    } else {
                                        return "node"
                                    }
                                })
                                .attr("transform", function(d) {
                                    return "translate(" + d.y * scaleY + "," + d.x * scaleX + ")";
                                });



                            nodes.forEach(function(d) {
                                d.y = d.depth * 180;
                            });
                            var mouseOut = false;

                            node.append("circle")
                                .attr("r", 5);

                            node.append("text")
                                .attr("dy", 15)
                                .attr("dx", 0)
                                .style("text-anchor", "middle")
                                .text(function(d) {
                                    return d.obj.name;
                                })
                                .on("mouseover", function(d) {
                                    //console.log(d3.event);
                                    if (d.obj && d.obj.description) {
                                        mouseOut = false;
                                        var y = d3.event.clientY;
                                        var x = d3.event.clientX;
                                        $(element[0]).css("position", "relative");
                                        tooltip.style("top", y + "px")
                                            .style("left", x + "px")
                                            .html(
                                                "<div>" + d.obj.description + "</div>");
                                        var prereq = d.obj.requires ? d.obj.requires.unlocked : null;
                                        var meetsPrereq = meetsReq(d.obj);

                                        if (meetsPrereq) {
                                            if (!d.obj.unlocked) {
                                                if (d.obj.cost <= scope.sectorObj.points || !d.obj.cost) {
                                                    var btn = $("<button>Unlock (" + d.obj.cost + " point" + (d.obj.cost > 1 ? "s" : "") + ")</button>");
                                                    btn.on('click', function() {
                                                        scope.sectorObj.points -= d.obj.cost;
                                                        Player.unlock(d.obj.id);
                                                        var msg = "You've unlocked " + d.obj.name + "!";
                                                        Engine.log(msg);
                                                        Engine.createNotification(msg, 'unlock');
                                                        tooltip.style("visibility", "hidden");
                                                        create();
                                                        draw();
                                                    });

                                                    $(tooltip[0][0]).append(btn);
                                                } else {
                                                    $(tooltip[0][0]).append("<div>Not enough points</div>");
                                                }
                                            } else {
                                                $(tooltip[0][0]).append("<div>Unlocked</div>");
                                            }
                                        } else {
                                            $(tooltip[0][0]).append("<div>Prerequisites not met</div>");
                                        }


                                        var h = tooltip[0][0].offsetHeight;

                                        if (y + h + 40 > window.innerHeight) {
                                            y = window.innerHeight - h - 40;
                                        }


                                        return tooltip.style("top", y + "px")
                                            .style("visibility", "visible");
                                    }

                                })
                                .on("mouseout", function(d) {
                                    mouseOut = true;
                                    setTimeout(function() {
                                        if (mouseOut) {
                                            return tooltip.style("visibility", "hidden")
                                        }
                                    }, 1000);

                                });

                            tooltip.on("mouseover", function() {
                                mouseOut = false;
                            });
                            tooltip.on("mouseout", function() {
                                mouseOut = true;
                                setTimeout(function() {
                                    if (mouseOut) {
                                        return tooltip.style("visibility", "hidden")
                                    }
                                }, 1000);
                            });

                            /*node.append("foreignObject")
                                  .attr("width", 200)
                                  .attr("height", 150)
                                  .attr("transform", "translate(5, -10)")
                                  .attr("class", "description")
                                  .append("xhtml:div")
                                  .html(function(d){ 
                                      return "<div class='techNode'><h5>"+d.obj.name+"</h5><div>"+
                                      d.obj.description+"</div></div>"
                                  });*/

                            d3.select(self.frameElement).style("height", height + "px");
                        }
                    }

                    create();
                    draw();

                    $(document).on('researchTech', function() {
                        create();
                        draw();
                    });
                }
            };
        }
    ]);
