using Cadastro.Application.Audit;
using Cadastro.Application.Obras.Commands;
using Cadastro.Domain.Entities;
using Cadastro.Domain.Enums;
using Cadastro.Domain.Interfaces;
using FluentAssertions;
using Moq;
using Xunit;

namespace Cadastro.UnitTests.Obras;

public class CriarObraCommandHandlerTests
{
    private readonly Mock<IObraRepository> _repoMock;
    private readonly Mock<IObraAuditPublisher> _auditMock;
    private readonly CriarObraCommandHandler _handler;

    public CriarObraCommandHandlerTests()
    {
        _repoMock = new Mock<IObraRepository>();
        _auditMock = new Mock<IObraAuditPublisher>();
        _handler = new CriarObraCommandHandler(_repoMock.Object, _auditMock.Object);
    }

}
