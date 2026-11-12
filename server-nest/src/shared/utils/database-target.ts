// Describes where the app connects without leaking credentials from the URL.
// Never log DATABASE_URL itself: for Atlas it holds the user name and password.
export function describeDatabaseTarget(url: string, dbName: string): string {
  try {
    return `${new URL(url).host}/${dbName}`;
  } catch {
    // A multi-host URL (mongodb://a:1,b:2) is not a valid WHATWG URL
    const hosts = url.replace(/^[^:]+:\/\//, '').replace(/^[^@/]*@/, '');
    return `${hosts.split(/[/?]/)[0]}/${dbName}`;
  }
}
