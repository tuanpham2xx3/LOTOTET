import { generateTicket } from '../ticket';
import { validateTicket } from '../ticketValidator';

describe('Ticket Generator', () => {
  it('should generate a valid ticket', () => {
    const ticket = generateTicket();
    const result = validateTicket(ticket);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should pass 10,000 ticket test harness', () => {
    const ITERATIONS = 10_000;
    let passed = 0;
    const failures: { index: number; errors: string[] }[] = [];

    for (let i = 0; i < ITERATIONS; i++) {
      const ticket = generateTicket();
      const result = validateTicket(ticket);
      
      if (result.valid) {
        passed++;
      } else {
        failures.push({ index: i, errors: result.errors });
      }
    }

    console.log(`Passed: ${passed}/${ITERATIONS}`);
    
    if (failures.length > 0) {
      console.log('First 5 failures:', failures.slice(0, 5));
    }

    expect(passed).toBe(ITERATIONS);
  }, 60_000); // 60 second timeout for 10k iterations

  it('should generate unique tickets', () => {
    const tickets = Array.from({ length: 100 }, () => generateTicket());
    const serialized = tickets.map(t => JSON.stringify(t));
    const unique = new Set(serialized);
    
    expect(unique.size).toBeGreaterThan(90); // Allow some collision but unlikely
  });
});