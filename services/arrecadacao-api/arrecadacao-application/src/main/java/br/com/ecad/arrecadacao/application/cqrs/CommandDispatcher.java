package br.com.ecad.arrecadacao.application.cqrs;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.GenericTypeResolver;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class CommandDispatcher {
    private final Map<Class<?>, CommandHandler<?, ?>> handlers = new HashMap<>();

    @Autowired
    public CommandDispatcher(List<CommandHandler<?, ?>> handlerList) {
        for (CommandHandler<?, ?> handler : handlerList) {
            Class<?>[] typeArguments = GenericTypeResolver.resolveTypeArguments(handler.getClass(), CommandHandler.class);
            if (typeArguments != null && typeArguments.length > 0) {
                handlers.put(typeArguments[0], handler);
            }
        }
    }

    @SuppressWarnings("unchecked")
    public <C extends Command<R>, R> R dispatch(C command) {
        CommandHandler<C, R> handler = (CommandHandler<C, R>) handlers.get(command.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("No handler for " + command.getClass());
        }
        return handler.handle(command);
    }
}
