export interface ServerNode {
  id: string;
  name: string;
  weight: number;
  activeConnections: number;
  responseTime: number;
  cpuUsage: number;
  isHealthy: boolean;
  processedRequests: number;
}

export type LBAlgorithm =
  | 'round-robin'
  | 'weighted-round-robin'
  | 'smooth-round-robin'
  | 'power-of-two-choices'
  | 'consistent-hashing'
  | 'adaptive-feedback'
  | 'latency-based'
  | 'performance-based'
  | 'server-mesh'
  | 'idle-join-queue'
  | 'least-connections'
  | 'weighted-least-connections';

export const ALGORITHM_DESCRIPTIONS: Record<LBAlgorithm, string> = {
  'round-robin': 'Cycles through servers in order, one request each.',
  'weighted-round-robin': 'Like Round Robin but higher-weight servers receive more requests.',
  'smooth-round-robin': 'Nginx-style: distributes weighted requests evenly without bursts.',
  'power-of-two-choices': 'Picks two random healthy servers and routes to the one with fewer active connections to avoid the herd effect.',
  'consistent-hashing': 'Same request key always maps to the same server (sticky routing).',
  'adaptive-feedback': 'Picks the server with the best combined CPU + latency score.',
  'latency-based': 'Always routes to the server with the lowest response time.',
  'performance-based': 'Always routes to the server with the lowest CPU usage.',
  'server-mesh': 'Picks a server at random (service mesh / sidecar proxy style).',
  'idle-join-queue': 'Prefers idle servers (0 connections); falls back to least-connections.',
  'least-connections': 'Routes to the server handling the fewest active connections.',
  'weighted-least-connections': 'Least-connections adjusted by server weight.',
};

export class LoadBalancerSimulator {
  private servers: ServerNode[] = [];

  // Round Robin
  private rrIndex = 0;

  // Weighted Round Robin
  public currentWeightCount = 0;
  public serverWeightIndex = 0;

  // Smooth Round Robin (Nginx algorithm)
  private effectiveWeights: Record<string, number> = {};

  constructor(initialServers: ServerNode[]) {
    this.servers = initialServers;
  }

  setServers(newServers: ServerNode[]) {
    this.servers = newServers;
  }

  reset(initialServers: ServerNode[]) {
    this.servers = initialServers;
    this.rrIndex = 0;
    this.currentWeightCount = 0;
    this.serverWeightIndex = 0;
    this.effectiveWeights = {};
  }

  getWeightStats() {
    return {
      currentWeightCount: this.currentWeightCount,
      currentIndex: this.serverWeightIndex % (this.servers.length || 1),
    };
  }

  routeRequest(algorithm: LBAlgorithm, requestKey?: string): ServerNode | null {
    const healthyServers = this.servers.filter((s) => s.isHealthy);
    if (healthyServers.length === 0) return null;

    switch (algorithm) {
      case 'round-robin':
        return this.roundRobin(healthyServers);
      case 'weighted-round-robin':
        return this.weightedRoundRobin(healthyServers);
      case 'smooth-round-robin':
        return this.smoothRoundRobin(healthyServers);
      case 'power-of-two-choices': 
        return this.powerOfTwoChoices(healthyServers);
      case 'consistent-hashing':
        return this.consistentHashing(healthyServers, requestKey);
      case 'adaptive-feedback':
        return this.adaptiveFeedback(healthyServers);
      case 'latency-based':
        return this.latencyBased(healthyServers);
      case 'performance-based':
        return this.performanceBased(healthyServers);
      case 'server-mesh':
        return this.serverMesh(healthyServers);
      case 'idle-join-queue':
        return this.idleJoinQueue(healthyServers);
      case 'least-connections':
        return this.leastConnections(healthyServers);
      case 'weighted-least-connections':
        return this.weightedLeastConnections(healthyServers);
      default:
        return healthyServers[0];
    }
  }

  // ─── Private corrected algorithm implementations ────────────────────────────

  private roundRobin(servers: ServerNode[]): ServerNode {
    // تصحيح: حماية الـ Index من الانحراف وتصفيره عند تغير حجم المصفوفة
    if (this.rrIndex >= servers.length) {
      this.rrIndex = 0;
    }
    const server = servers[this.rrIndex];
    this.rrIndex = (this.rrIndex + 1) % servers.length;
    return server;
  }

  private weightedRoundRobin(servers: ServerNode[]): ServerNode {
    const validServers = servers.filter((s) => s.weight > 0);
    if (validServers.length === 0) return servers[0];

    if (this.serverWeightIndex >= validServers.length) {
      this.serverWeightIndex = 0;
      this.currentWeightCount = 0;
    }

    while (true) {
      const currentServer = validServers[this.serverWeightIndex % validServers.length];
      if (this.currentWeightCount < currentServer.weight) {
        this.currentWeightCount++;
        return currentServer;
      }
      this.serverWeightIndex = (this.serverWeightIndex + 1) % validServers.length;
      this.currentWeightCount = 0;
    }
  }

  private smoothRoundRobin(servers: ServerNode[]): ServerNode {
    let totalWeight = 0;
    let maxServer: ServerNode = servers[0];
    let maxWeight = -Infinity;

    // تصحيح: تنظيف الـ State الفعالة القديمة للسيرفرات التي خرجت عن الخدمة لمنع تلوث الذاكرة
    const healthyIds = new Set(servers.map(s => s.id));
    Object.keys(this.effectiveWeights).forEach(id => {
      if (!healthyIds.has(id)) delete this.effectiveWeights[id];
    });

    servers.forEach((s) => {
      if (!(s.id in this.effectiveWeights)) {
        this.effectiveWeights[s.id] = 0;
      }
      this.effectiveWeights[s.id] += s.weight;
      totalWeight += s.weight;

      if (this.effectiveWeights[s.id] > maxWeight) {
        maxWeight = this.effectiveWeights[s.id];
        maxServer = s;
      }
    });

    this.effectiveWeights[maxServer.id] -= totalWeight;
    return maxServer;
  }

  private powerOfTwoChoices(servers: ServerNode[]): ServerNode {
    if (servers.length === 1) return servers[0];

    const idx1 = Math.floor(Math.random() * servers.length);
    const server1 = servers[idx1];

    const remainingServers = servers.filter((_, idx) => idx !== idx1);
    const idx2 = Math.floor(Math.random() * remainingServers.length);
    const server2 = remainingServers[idx2];

    return server1.activeConnections <= server2.activeConnections ? server1 : server2;
  }

  private consistentHashing(servers: ServerNode[], requestKey?: string): ServerNode {
    const key = requestKey ?? Math.random().toString(36).slice(2);
    
    // تصحيح: استخدام خوارزمية Polynomial Rolling Hash (DJB2 المصغرة) لمنع تصادم المفاتيح مثل AB و BA
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 33) ^ key.charCodeAt(i);
    }
    
    // ضمان تحويل القيمة إلى رقم موجب دائماً قبل استخدام باقي القسمة
    const positiveHash = Math.abs(hash);
    return servers[positiveHash % servers.length];
  }

  private adaptiveFeedback(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) =>
      curr.cpuUsage * 0.7 + curr.responseTime * 0.3 <
      prev.cpuUsage * 0.7 + prev.responseTime * 0.3
        ? curr
        : prev
    );
  }

  private latencyBased(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) =>
      curr.responseTime < prev.responseTime ? curr : prev
    );
  }

  private performanceBased(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) =>
      curr.cpuUsage < prev.cpuUsage ? curr : prev
    );
  }

  private serverMesh(servers: ServerNode[]): ServerNode {
    return servers[Math.floor(Math.random() * servers.length)];
  }

  private idleJoinQueue(servers: ServerNode[]): ServerNode {
    const idle = servers.find((s) => s.activeConnections === 0);
    return idle ?? this.leastConnections(servers);
  }

  private leastConnections(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) =>
      curr.activeConnections < prev.activeConnections ? curr : prev
    );
  }

  private weightedLeastConnections(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) =>
      curr.activeConnections / (curr.weight || 1) <
      prev.activeConnections / (prev.weight || 1)
        ? curr
        : prev
    );
  }
}