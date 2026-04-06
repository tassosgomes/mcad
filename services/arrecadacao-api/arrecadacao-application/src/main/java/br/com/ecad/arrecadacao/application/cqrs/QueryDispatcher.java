package br.com.ecad.arrecadacao.application.cqrs;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.GenericTypeResolver;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class QueryDispatcher {
    private final Map<Class<?>, QueryHandler<?, ?>> handlers = new HashMap<>();

    @Autowired
    public QueryDispatcher(List<QueryHandler<?, ?>> handlerList) {
        for (QueryHandler<?, ?> handler : handlerList) {
            Class<?>[] typeArguments = GenericTypeResolver.resolveTypeArguments(handler.getClass(), QueryHandler.class);
            if (typeArguments != null && typeArguments.length > 0) {
                handlers.put(typeArguments[0], handler);
            }
        }
    }

    @SuppressWarnings("unchecked")
    public <Q extends Query<R>, R> R dispatch(Q query) {
        QueryHandler<Q, R> handler = (QueryHandler<Q, R>) handlers.get(query.getClass());
        if (handler == null) {
            throw new IllegalArgumentException("No handler for " + query.getClass());
        }
        return handler.handle(query);
    }
}
