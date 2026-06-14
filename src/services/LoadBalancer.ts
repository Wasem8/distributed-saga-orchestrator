// src/services/LoadBalancer.ts

export interface ServerNode {
  id: string;
  name: string;
  weight: number;          // الوزن للخوارزميات الموزونة
  activeConnections: number; // عدد الاتصالات الحالية
  responseTime: number;      // وقت الاستجابة بالملي ثانية
  cpuUsage: number;          // استهلاك المعالج
  isHealthy: boolean;        // فحص الحالة (Health Check)
}

export type LBAlgorithm =
  | 'round-robin'
  | 'weighted-round-robin'
  | 'least-connections'
  | 'power-of-two'
  | 'resource-aware';

export class LoadBalancerSimulator {
  private servers: ServerNode[] = [];
  private rrIndex = 0;

  public currentWeightCount = 0;
  public serverWeightIndex = 0;

  constructor(initialServers: ServerNode[]) {
    this.servers = initialServers;
  }

  setServers(newServers: ServerNode[]) {
    this.servers = newServers;
  }

  getWeightStats() {
    return {
      currentWeightCount: this.currentWeightCount,
      currentIndex: this.serverWeightIndex % (this.servers.length || 1)
    };
  }

  routeRequest(algorithm: LBAlgorithm): ServerNode | null {
    // تصفية السيرفرات الحية فقط (نمط Health Check)
    const healthyServers = this.servers.filter(s => s.isHealthy);
    if (healthyServers.length === 0) return null;

    switch (algorithm) {
      case 'round-robin':
        return this.roundRobin(healthyServers);
      case 'weighted-round-robin':
        return this.weightedRoundRobin(healthyServers);
      case 'least-connections':
        return this.leastConnections(healthyServers);
      case 'power-of-two':
        return this.powerOfTwoChoices(healthyServers);
      case 'resource-aware':
        return this.resourceAware(healthyServers);
      default:
        return healthyServers[0];
    }
  }

  // 1. خوارزمية التناوب الدائري
  private roundRobin(servers: ServerNode[]): ServerNode {
    const server = servers[this.rrIndex % servers.length];
    this.rrIndex++;
    return server;
  }



private weightedRoundRobin(servers: ServerNode[]): ServerNode {
  // 1. الدوران للبحث عن سيرفر ما زال يمتلك أوزان متاحاً في الدورة الحالية
  while (true) {
    const currentServer = servers[this.serverWeightIndex % servers.length];
    
    if (this.currentWeightCount < currentServer.weight) {
      this.currentWeightCount++; // استهلاك حصة واحدة من وزن السيرفر الحالي
      return currentServer;
    }
    
    // 2. إذا استهلك السيرفر الحالي كل حصته (أوزانه)، ننتقل للسيرفر التالي ونصفّر العداد
    this.serverWeightIndex++;
    this.currentWeightCount = 0;
  }
}

  // 3. خوارزمية الاتصالات الأقل
  private leastConnections(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) => 
      curr.activeConnections < prev.activeConnections ? curr : prev
    );
  }

  // 4. خوارزمية قوة الخيارين (Power of Two Choices)
  private powerOfTwoChoices(servers: ServerNode[]): ServerNode {
    if (servers.length === 1) return servers[0];
    const idx1 = Math.floor(Math.random() * servers.length);
    let idx2 = Math.floor(Math.random() * servers.length);
    while (idx1 === idx2) {
      idx2 = Math.floor(Math.random() * servers.length);
    }
    return servers[idx1].activeConnections <= servers[idx2].activeConnections 
      ? servers[idx1] 
      : servers[idx2];
  }

  // 5. خوارزمية استهلاك الموارد (Resource-Aware)
  private resourceAware(servers: ServerNode[]): ServerNode {
    return servers.reduce((prev, curr) => 
      curr.cpuUsage < prev.cpuUsage ? curr : prev
    );
  }
}