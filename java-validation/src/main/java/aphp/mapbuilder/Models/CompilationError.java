package aphp.mapbuilder.Models;

public class CompilationError extends Exception {
    public CompilationError(String message) {
        super(message);
    }
}
