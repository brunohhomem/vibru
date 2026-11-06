import { Injectable } from '@nestjs/common';
import type { HealthRecord } from '@vibru/shared';
import type { CurrentMemberContext } from '../couple/decorators/current-member.decorator';
import { MedicationsService } from '../medications/medications.service';
import { toMedication } from '../medications/medication.mapper';
import { AllergiesRepository } from './allergies.repository';
import { DoctorsRepository } from './doctors.repository';
import { EmergencyContactsRepository } from './emergency-contacts.repository';
import { HealthConditionsRepository } from './health-conditions.repository';
import { HealthEventsRepository } from './health-events.repository';
import { HealthMemberAccessService } from './health-member-access.service';
import { HealthProfileRepository } from './health-profile.repository';
import {
  emptyProfile,
  toAllergy,
  toDoctor,
  toEmergencyContact,
  toHealthCondition,
  toHealthEvent,
  toHealthProfile,
} from './health.mappers';

/** Monta a ficha completa de um membro para a tela de ficha e o modo emergência. */
@Injectable()
export class HealthRecordService {
  constructor(
    private readonly memberAccess: HealthMemberAccessService,
    private readonly profileRepository: HealthProfileRepository,
    private readonly allergiesRepository: AllergiesRepository,
    private readonly conditionsRepository: HealthConditionsRepository,
    private readonly contactsRepository: EmergencyContactsRepository,
    private readonly doctorsRepository: DoctorsRepository,
    private readonly medicationsService: MedicationsService,
    private readonly eventsRepository: HealthEventsRepository,
  ) {}

  async get(member: CurrentMemberContext, memberId: string): Promise<HealthRecord> {
    const target = await this.memberAccess.requireMember(member.coupleId, memberId);
    const { coupleId } = member;

    const [profile, allergies, conditions, contacts, doctors, medications, events] =
      await Promise.all([
        this.profileRepository.findByMember(coupleId, memberId),
        this.allergiesRepository.listByMember(coupleId, memberId),
        this.conditionsRepository.listByMember(coupleId, memberId),
        this.contactsRepository.listByMember(coupleId, memberId),
        this.doctorsRepository.listByMember(coupleId, memberId),
        this.medicationsService.listByMember(coupleId, memberId),
        this.eventsRepository.listByMember(coupleId, memberId),
      ]);

    return {
      memberId: target.id,
      memberName: target.displayName,
      profile: profile ? toHealthProfile(profile) : emptyProfile(),
      allergies: allergies.map(toAllergy),
      conditions: conditions.map(toHealthCondition),
      contacts: contacts.map(toEmergencyContact),
      doctors: doctors.map(toDoctor),
      medications: medications.map(toMedication),
      events: events.map(toHealthEvent),
    };
  }
}
