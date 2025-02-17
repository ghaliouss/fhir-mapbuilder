export class ApiConstants {
    public static apiServerPort: string = '9031';
    public static readonly healthCheckUrl: string = `http://localhost:${ApiConstants.apiServerPort}/health`;
    public static readonly validateUrl: string = `http://localhost:${ApiConstants.apiServerPort}/api/matchbox/validate`;
    public static readonly resetAndLoadEngineUrl: string = `http://localhost:${ApiConstants.apiServerPort}/api/matchbox/resetAndLoadEngine`;
    public static readonly shutDownUrl: string = `http://localhost:${ApiConstants.apiServerPort}/shutdown`;
}
