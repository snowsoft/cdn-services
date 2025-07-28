const { expect } = require('chai');
const sinon = require('sinon');

// Example service to test
const UserService = require('../../src/services/userService');
const UserRepository = require('../../src/repositories/userRepository');

describe('UserService Unit Tests', () => {
    let userService;
    let userRepositoryStub;

    beforeEach(() => {
        // Create stub for repository
        userRepositoryStub = sinon.createStubInstance(UserRepository);
        userService = new UserService(userRepositoryStub);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('#createUser', () => {
        it('should create a new user successfully', async () => {
            // Arrange
            const userData = {
                name: 'John Doe',
                email: 'john@example.com',
                password: 'securePassword123'
            };

            const expectedUser = {
                id: 'user-123',
                ...userData,
                password: 'hashedPassword',
                createdAt: new Date()
            };

            userRepositoryStub.create.resolves(expectedUser);

            // Act
            const result = await userService.createUser(userData);

            // Assert
            expect(result).to.deep.equal(expectedUser);
            expect(userRepositoryStub.create.calledOnce).to.be.true;
            expect(userRepositoryStub.create.firstCall.args[0]).to.have.property('password');
            expect(userRepositoryStub.create.firstCall.args[0].password).to.not.equal(userData.password);
        });

        it('should throw error if email already exists', async () => {
            // Arrange
            const userData = {
                name: 'John Doe',
                email: 'existing@example.com',
                password: 'password123'
            };

            userRepositoryStub.findByEmail.resolves({ id: 'existing-user' });

            // Act & Assert
            await expect(userService.createUser(userData))
                .to.be.rejectedWith('Email already exists');

            expect(userRepositoryStub.create.called).to.be.false;
        });

        it('should validate email format', async () => {
            // Arrange
            const userData = {
                name: 'John Doe',
                email: 'invalid-email',
                password: 'password123'
            };

            // Act & Assert
            await expect(userService.createUser(userData))
                .to.be.rejectedWith('Invalid email format');
        });
    });

    describe('#getUserById', () => {
        it('should return user when found', async () => {
            // Arrange
            const userId = 'user-123';
            const expectedUser = {
                id: userId,
                name: 'John Doe',
                email: 'john@example.com'
            };

            userRepositoryStub.findById.resolves(expectedUser);

            // Act
            const result = await userService.getUserById(userId);

            // Assert
            expect(result).to.deep.equal(expectedUser);
            expect(userRepositoryStub.findById.calledWith(userId)).to.be.true;
        });

        it('should throw error when user not found', async () => {
            // Arrange
            const userId = 'non-existent';
            userRepositoryStub.findById.resolves(null);

            // Act & Assert
            await expect(userService.getUserById(userId))
                .to.be.rejectedWith('User not found');
        });
    });

    describe('#updateUser', () => {
        it('should update user successfully', async () => {
            // Arrange
            const userId = 'user-123';
            const updateData = {
                name: 'Jane Doe'
            };

            const existingUser = {
                id: userId,
                name: 'John Doe',
                email: 'john@example.com'
            };

            const updatedUser = {
                ...existingUser,
                ...updateData,
                updatedAt: new Date()
            };

            userRepositoryStub.findById.resolves(existingUser);
            userRepositoryStub.update.resolves(updatedUser);

            // Act
            const result = await userService.updateUser(userId, updateData);

            // Assert
            expect(result).to.deep.equal(updatedUser);
            expect(userRepositoryStub.update.calledWith(userId, updateData)).to.be.true;
        });
    });

    describe('#deleteUser', () => {
        it('should delete user successfully', async () => {
            // Arrange
            const userId = 'user-123';
            const existingUser = {
                id: userId,
                name: 'John Doe'
            };

            userRepositoryStub.findById.resolves(existingUser);
            userRepositoryStub.delete.resolves(true);

            // Act
            const result = await userService.deleteUser(userId);

            // Assert
            expect(result).to.be.true;
            expect(userRepositoryStub.delete.calledWith(userId)).to.be.true;
        });
    });
});